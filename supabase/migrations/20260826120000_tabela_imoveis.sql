-- Primeira feature exclusiva do público imobiliário: cadastro de imóvel.
-- Sem isso não existe CRM imobiliário de verdade — hoje o sistema só sabe
-- falar de "lead", não tem onde guardar o imóvel em si nem vincular
-- "esse lead quer esse imóvel" (isso vem depois, num passo futuro).
create table public.imoveis (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid not null references public.usuarios(id),
  titulo text not null,
  tipo text not null default 'apartamento'
    check (tipo in ('apartamento', 'casa', 'terreno', 'sala_comercial', 'galpao', 'outro')),
  finalidade text not null default 'venda'
    check (finalidade in ('venda', 'aluguel', 'venda_aluguel')),
  valor_venda numeric,
  valor_aluguel numeric,
  endereco text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  quartos int,
  banheiros int,
  vagas_garagem int,
  area_m2 numeric,
  descricao text,
  status text not null default 'disponivel'
    check (status in ('disponivel', 'reservado', 'vendido', 'alugado', 'inativo')),
  proprietario_nome text,
  proprietario_telefone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Soft delete, igual todo o resto do sistema — nada some de vez.
  arquivado_em timestamptz
);

alter table public.imoveis enable row level security;

create trigger trg_set_updated_at
  before update on public.imoveis
  for each row execute function public.set_updated_at();

create policy "imoveis_por_org" on public.imoveis
  for all
  using (org_id = private.current_org_id())
  with check (org_id = private.current_org_id());

create index imoveis_org_status_idx on public.imoveis (org_id, status) where arquivado_em is null;
