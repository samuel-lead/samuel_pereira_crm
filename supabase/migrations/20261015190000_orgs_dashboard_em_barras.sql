-- Samuel (15/10/26): a Visão geral da empresa dele mostra o funil em barras
-- (resultado + crescimento sobre o período anterior num cartão só). As
-- outras empresas continuam com o visual de sempre até pedirem.
alter table public.orgs
  add column dashboard_em_barras boolean not null default false;

update public.orgs set dashboard_em_barras = true where id = 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
