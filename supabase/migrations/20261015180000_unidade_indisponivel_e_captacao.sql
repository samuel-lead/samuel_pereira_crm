-- 1) Unidade que sumiu da tabela do mês fica "indisponível" (provavelmente
--    vendida por fora). Nova situação além de disponível/reservada/vendida.
-- 2) Venda de captação (imóvel de terceiros): marca no lead que o imóvel
--    não é de empreendimento próprio; a descrição vai em leads.produto.
alter table public.unidades_imovel drop constraint unidades_imovel_status_check;
alter table public.unidades_imovel
  add constraint unidades_imovel_status_check
  check (status in ('disponivel', 'reservada', 'vendida', 'indisponivel'));

alter table public.leads
  add column imovel_captacao boolean not null default false;
