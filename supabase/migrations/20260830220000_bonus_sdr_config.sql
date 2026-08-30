-- Os valores do bônus SDR (metas de calls, valor por fim de semana,
-- metas de faturamento) eram fixos no código. Agora viram configuração
-- por empresa, editável em Configurações — só faz sentido pro público
-- mentoria, imobiliário não tem essa mecânica. Os defaults reproduzem
-- exatamente a régua fixa que já existia, então nenhuma org muda de
-- comportamento até o admin editar.
create table public.bonus_sdr_config (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid not null references public.usuarios(id),
  calls_tier1_qtd int not null default 60,
  calls_tier1_valor numeric not null default 300,
  calls_tier2_qtd int not null default 80,
  calls_tier2_valor numeric not null default 500,
  calls_tier3_qtd int not null default 100,
  calls_tier3_valor numeric not null default 1000,
  valor_call_fim_semana numeric not null default 20,
  faturamento_tier1_valor numeric not null default 50000,
  faturamento_tier1_bonus numeric not null default 1000,
  faturamento_tier2_valor numeric not null default 80000,
  faturamento_tier2_bonus numeric not null default 2000,
  faturamento_tier3_valor numeric not null default 100000,
  faturamento_tier3_bonus numeric not null default 3000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id)
);

alter table public.bonus_sdr_config enable row level security;

create trigger trg_set_updated_at
  before update on public.bonus_sdr_config
  for each row execute function public.set_updated_at();

create policy "bonus_sdr_config_select_org" on public.bonus_sdr_config
  for select
  using (org_id = private.current_org_id());

create policy "bonus_sdr_config_update_admin" on public.bonus_sdr_config
  for update
  using (org_id = private.current_org_id() and private.eh_admin())
  with check (org_id = private.current_org_id() and private.eh_admin());

-- Backfill pras empresas mentoria que já existem hoje.
insert into public.bonus_sdr_config (org_id, usuario_id)
select distinct on (o.id) o.id, u.id
from public.orgs o
join public.usuarios u on u.org_id = o.id and u.papel = 'admin'
where o.publico = 'mentoria'
order by o.id, u.created_at
on conflict (org_id) do nothing;
