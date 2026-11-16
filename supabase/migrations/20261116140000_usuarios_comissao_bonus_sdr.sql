-- Samuel (16/11/26): SDR que recebe COMISSÃO sobre a receita das vendas (em vez
-- de salário fixo), além dos bônus normais por call. Percentual sobre a receita
-- (dinheiro recebido) das vendas creditadas a ele. Null/0 = sem comissão.
alter table public.usuarios
  add column if not exists bonus_comissao_percentual numeric
  check (bonus_comissao_percentual is null or (bonus_comissao_percentual >= 0 and bonus_comissao_percentual <= 100));

-- Luiz Paulo (CRM do Samuel): 10% sobre a receita da venda.
update public.usuarios
   set bonus_comissao_percentual = 10
 where id = 'd88abc55-efeb-49a6-bf1b-a97e3c8bc671'
   and org_id = 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
