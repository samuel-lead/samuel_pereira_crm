-- Samuel (20/10/26): o bônus de SDR da Veend (CRM do Danilo) passa a ser só
-- DOIS itens, diferente do da empresa do Samuel:
--   1) call marcada, realizada e qualificada: R$ 20 (no mês em que acontece);
--   2) quando sai venda: R$ 100 no total, ou seja +R$ 80 (no mês da venda,
--      mesmo que a call tenha sido em outro mês).
-- Sem regra de fim de semana (valores iguais aos de semana) e sem bônus de
-- receita (faixas zeradas). A trava de no-show continua (35%).
update public.bonus_sdr_config set
  modelo = 'por_call',
  valor_por_call = 20,
  valor_call_fim_semana = 20,
  valor_por_call_venda = 100,
  valor_por_call_venda_fim_semana = 100,
  faturamento_tier1_bonus = 0,
  faturamento_tier2_bonus = 0,
  faturamento_tier3_bonus = 0
where org_id = '1cc080fd-055d-4f8b-950c-7537cf4f0064';
