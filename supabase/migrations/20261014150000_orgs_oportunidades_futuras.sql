-- Samuel (14/10/26): na Banker - Consorcio, "Repescagem futura de ICP" passa
-- a se chamar "Oportunidades Futuras". Só o nome visível muda (nenhum dado).
alter table public.orgs
  add column nome_oportunidades_futuras boolean not null default false;

update public.orgs set nome_oportunidades_futuras = true where id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed';
