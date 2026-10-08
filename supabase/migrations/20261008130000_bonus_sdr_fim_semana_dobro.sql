-- Samuel (08/10/26): no fim de semana tudo vale o dobro. Call realizada e
-- qualificada marcada no sábado/domingo paga R$ 40 (semana: R$ 20) e a
-- venda dela continua em R$ 100 (semana: R$ 50).
update public.bonus_sdr_config
set valor_call_fim_semana = 40
where org_id = 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
