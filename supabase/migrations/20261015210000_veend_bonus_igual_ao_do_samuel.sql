-- Samuel (15/10/26): o bônus de SDR da Veend passa a ser o mesmo da empresa
-- dele (modelo por call, mesmos valores e mesma trava de no-show). Não copia
-- a data de início (bonus_inicio), que era só da empresa dele.
update public.bonus_sdr_config v set
  modelo = s.modelo,
  valor_por_call = s.valor_por_call,
  valor_por_call_venda = s.valor_por_call_venda,
  valor_por_call_venda_fim_semana = s.valor_por_call_venda_fim_semana,
  no_show_maximo = s.no_show_maximo,
  valor_call_fim_semana = s.valor_call_fim_semana,
  faturamento_tier1_valor = s.faturamento_tier1_valor,
  faturamento_tier1_bonus = s.faturamento_tier1_bonus,
  faturamento_tier2_valor = s.faturamento_tier2_valor,
  faturamento_tier2_bonus = s.faturamento_tier2_bonus,
  faturamento_tier3_valor = s.faturamento_tier3_valor,
  faturamento_tier3_bonus = s.faturamento_tier3_bonus
from public.bonus_sdr_config s
where v.org_id = '1cc080fd-055d-4f8b-950c-7537cf4f0064'
  and s.org_id = 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
