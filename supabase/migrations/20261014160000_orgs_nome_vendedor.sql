-- Samuel (14/10/26): na Banker - Consorcio o papel de SDR se chama
-- "Vendedor". Só o texto visível muda; o valor interno usuarios.funcao='sdr'
-- continua igual.
alter table public.orgs
  add column chama_sdr_de_vendedor boolean not null default false;

update public.orgs set chama_sdr_de_vendedor = true where id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed';
