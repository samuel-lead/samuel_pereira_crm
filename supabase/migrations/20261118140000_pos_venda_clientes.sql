-- Samuel (18/11/26): pós-venda na aba Clientes, em todos os CRMs. Cada cliente
-- (lead vendido) ganha um "próximo contato" de pós-venda e a data do último
-- contato. O histórico do que foi conversado vai como nota na linha do tempo
-- do lead (tabela interacoes), então não precisa de tabela nova.
--  * pos_venda_proximo_em: dia do próximo contato (vazio + já teve contato =
--    "sem novo contato"; vazio e nunca teve contato = "pra fazer").
--  * pos_venda_ultimo_contato_em: quando foi o último contato de pós-venda.
alter table public.leads
  add column if not exists pos_venda_proximo_em date,
  add column if not exists pos_venda_ultimo_contato_em timestamptz;
