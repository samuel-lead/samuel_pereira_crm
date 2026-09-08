-- Samuel pediu pra desativar por completo o robô que movia lead pronto
-- pra contato de volta pra Novos Leads sozinho (mesmo só pra Base, nível
-- 9) — ele quer que o lead fique só marcado como atrasado, sem sair da
-- aba onde já está. A função continua existindo (histórico/referência),
-- só o agendamento pg_cron que dispara ela a cada 10 minutos é removido.
select cron.unschedule('mover-leads-prontos-contato');
