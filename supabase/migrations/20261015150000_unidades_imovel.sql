-- Samuel (15/10/26): empreendimento (imóvel) passa a ter unidades — número,
-- andar, metragem, quartos, vagas e preço — pra escolher a unidade na hora
-- de registrar a venda. Entram por planilha (CSV/Excel), igual importar leads.
-- Nada é apagado de verdade: remover uma unidade só arquiva (arquivado_em).
create table public.unidades_imovel (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid references public.usuarios(id),
  imovel_id uuid not null references public.imoveis(id),
  numero text not null,
  andar integer,
  area_m2 numeric,
  quartos integer,
  suites integer,
  vagas integer,
  valor numeric,
  status text not null default 'disponivel' check (status in ('disponivel', 'reservada', 'vendida')),
  lead_id uuid references public.leads(id),
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  arquivado_em timestamptz
);

-- Uma unidade por número dentro do empreendimento (as arquivadas não contam).
create unique index unidades_imovel_numero_ativo_idx
  on public.unidades_imovel (imovel_id, numero)
  where arquivado_em is null;

create index unidades_imovel_imovel_idx on public.unidades_imovel (imovel_id);

alter table public.unidades_imovel enable row level security;

create policy unidades_imovel_por_org on public.unidades_imovel
  for all
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

create trigger trg_set_updated_at
  before update on public.unidades_imovel
  for each row execute function public.set_updated_at();
