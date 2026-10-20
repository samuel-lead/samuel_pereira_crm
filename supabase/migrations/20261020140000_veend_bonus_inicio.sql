-- Samuel (20/10/26): o bônus da Veend só começa a contar a partir de
-- 19/10/2026 (inclusive) — não é o mês inteiro.
update public.bonus_sdr_config
set bonus_inicio = '2026-10-19'
where org_id = '1cc080fd-055d-4f8b-950c-7537cf4f0064';
