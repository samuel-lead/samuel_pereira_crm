-- Proposta de consórcio (Banker): crédito, lance, prazo, parcela etc. preenchidos
-- no card do lead ao iniciar a proposta. Guardada num campo só, no próprio lead
-- (já protegido pelas políticas de segurança da tabela leads).
alter table public.leads add column if not exists proposta_consorcio jsonb;
