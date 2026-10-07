-- Samuel (07/10/26): o bônus da equipe dele fica zerado até o dia 10/10/2026
-- e só passa a contar (calls, receita e no-show) a partir dessa data.
-- Null = conta desde o começo do período (comportamento de sempre).
alter table public.bonus_sdr_config add column bonus_inicio date;

update public.bonus_sdr_config
set bonus_inicio = '2026-10-10'
where org_id = 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
