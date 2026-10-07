-- Samuel (07/10/26) quer um bônus de SDR por call, já que o comercial dele
-- ainda está no início e não alcança as faixas de 60/80/100 calls:
--   R$ 20 por call marcada pelo SDR, realizada e qualificada
--   R$ 40 se ela foi marcada no sábado/domingo
--   R$ 50 se a call virou venda (no lugar dos R$ 20/40, não soma)
--   + faturamento do mês nas mesmas faixas de sempre
--   Se o no-show do mês passar de 35%, o bônus por call não vale.
-- Vira um "modelo" por empresa: as empresas atuais continuam em 'faixas'
-- (nada muda pra elas) e só a do Samuel passa pra 'por_call'.
alter table public.bonus_sdr_config
  add column modelo text not null default 'faixas' check (modelo in ('faixas', 'por_call')),
  add column valor_por_call numeric not null default 20,
  add column valor_por_call_venda numeric not null default 50,
  add column no_show_maximo numeric not null default 0.35;

update public.bonus_sdr_config
set modelo = 'por_call', valor_call_fim_semana = 40
where org_id = 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
