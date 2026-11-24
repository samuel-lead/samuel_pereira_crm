-- Samuel (24/11/26): Inove Gôndolas precisa anexar a proposta em PDF no lead e
-- abrir de volta depois. Os PDFs ficam num espaço PRIVADO (bucket
-- 'propostas-pdf'): só quem é da mesma empresa e enxerga o lead consegue abrir,
-- e só por link temporário. Nada é apagado de verdade: PDF "removido" fica só
-- marcado em excluido_em e some da lista.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('propostas-pdf', 'propostas-pdf', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create table public.lead_propostas_pdf (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid references public.usuarios(id),
  lead_id uuid not null references public.leads(id),
  -- Caminho dentro do bucket: <org_id>/<lead_id>/<arquivo>.pdf
  caminho text not null,
  nome_arquivo text not null,
  tamanho_bytes bigint,
  criado_em timestamptz not null default now(),
  excluido_em timestamptz
);

create index lead_propostas_pdf_lead_idx on public.lead_propostas_pdf (lead_id) where excluido_em is null;

alter table public.lead_propostas_pdf enable row level security;

create policy lead_propostas_pdf_por_org on public.lead_propostas_pdf for all
  using (
    org_id = (select private.current_org_id())
    and exists (select 1 from public.leads l where l.id = lead_propostas_pdf.lead_id)
  )
  with check (
    org_id = (select private.current_org_id())
    and exists (select 1 from public.leads l where l.id = lead_propostas_pdf.lead_id)
  );

-- Arquivo: pasta 1 = empresa, pasta 2 = lead. O "exists ... leads" respeita a
-- RLS dos leads (quem não enxerga o lead também não enxerga o PDF dele).
create policy propostas_pdf_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'propostas-pdf'
    and (storage.foldername(name))[1] = (select private.current_org_id())::text
    and exists (select 1 from public.leads l where l.id::text = (storage.foldername(name))[2])
  );

create policy propostas_pdf_leitura on storage.objects for select to authenticated
  using (
    bucket_id = 'propostas-pdf'
    and (storage.foldername(name))[1] = (select private.current_org_id())::text
    and exists (select 1 from public.leads l where l.id::text = (storage.foldername(name))[2])
  );
