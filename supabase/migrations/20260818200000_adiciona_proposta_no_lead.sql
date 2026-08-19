-- O Closer precisa de um lugar pra registrar que mandou uma proposta pro
-- lead — hoje só existe "vendeu / não vendeu / remarcou" no resultado da
-- reunião, sem meio-termo pra "proposta enviada, aguardando resposta".
-- Fica na própria tabela leads (mesmo padrão de valor_venda/vendido_em),
-- não move o lead de coluna — é só uma anotação do estágio da negociação.
alter table public.leads
  add column proposta_valor numeric,
  add column proposta_enviada_em timestamptz,
  add column proposta_observacao text;
