-- Samuel (14/10/26): a Banker - Consorcio não usa "Farming" na Base de leads
-- (nem coluna, nem opção de motivo). Só esconde — nenhum dado é mexido.
alter table public.orgs
  add column sem_farming boolean not null default false;

update public.orgs set sem_farming = true where id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed';
