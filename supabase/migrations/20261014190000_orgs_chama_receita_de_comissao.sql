-- Samuel (14/10/26): na Banker - Consorcio o que entra pra eles é a
-- COMISSÃO, então onde o sistema diz "Receita" ela vê "Comissão". Só o nome
-- visível muda; os valores e as contas são os mesmos.
alter table public.orgs
  add column chama_receita_de_comissao boolean not null default false;

update public.orgs set chama_receita_de_comissao = true where id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed';
