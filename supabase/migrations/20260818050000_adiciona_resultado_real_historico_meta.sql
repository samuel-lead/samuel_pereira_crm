-- Faturamento e receita reais de meses anteriores ao CRM começar a
-- registrar lead por lead (antes de agosto/2026, só existia a planilha).
-- Fica null pros meses em que o CRM já tem lead de verdade — aí o
-- número é sempre calculado ao vivo pela soma dos leads, nunca por aqui.
alter table public.metas_mensais
  add column faturamento_real numeric,
  add column receita_real numeric;
