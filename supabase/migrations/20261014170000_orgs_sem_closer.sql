-- Samuel (14/10/26): a Banker - Consorcio não tem Closer — só "Vendedor"
-- (SDR), que qualifica, marca e faz a reunião. Some a função Closer, o
-- ranking de Closer e a escolha de quem faz a reunião.
alter table public.orgs
  add column sem_closer boolean not null default false;

update public.orgs set sem_closer = true where id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed';
