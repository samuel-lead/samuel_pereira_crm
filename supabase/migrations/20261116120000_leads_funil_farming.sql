-- Funil Farming (Samuel, 16/11/26): um segundo quadro com as mesmas etapas do
-- Pré-vendas, só pros leads marcados com funil = 'farming'. Lead sem marca
-- (null) continua no Pré-vendas normal. Por enquanto só o CRM do Samuel usa.
alter table public.leads
  add column if not exists funil text
  check (funil is null or funil in ('farming'));

create index if not exists leads_org_funil_idx on public.leads (org_id, funil) where funil is not null;
