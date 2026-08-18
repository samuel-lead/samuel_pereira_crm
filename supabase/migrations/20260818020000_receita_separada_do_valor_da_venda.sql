-- Valor da venda (faturamento, o preço combinado) e receita (o que já
-- entrou no caixa de fato) são coisas diferentes — CLAUDE.md é explícito
-- sobre isso. Até agora só existia valor_venda, sendo usado como se fosse
-- receita em todo o painel. Separando de vez.

alter table public.leads
  add column receita_venda numeric;
