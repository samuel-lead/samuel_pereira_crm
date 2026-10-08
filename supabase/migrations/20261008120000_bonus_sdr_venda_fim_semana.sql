-- Samuel (08/10/26): a venda que veio de uma call MARCADA no sábado/domingo
-- paga mais (R$ 100) que a de segunda a sexta (R$ 50). A call sem venda
-- paga R$ 20 em qualquer dia (o prêmio de fim de semana passou a ser na venda).
alter table public.bonus_sdr_config
  add column valor_por_call_venda_fim_semana numeric not null default 100;

update public.bonus_sdr_config
set valor_call_fim_semana = 20,
    valor_por_call_venda_fim_semana = 100
where org_id = 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
