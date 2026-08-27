-- Rastro de auditoria: hoje o nivel_historico registra O QUE mudou (de
-- qual nível pra qual), mas não QUEM fez. Adiciona usuario_id — fica nulo
-- nas movimentações automáticas (automatico=true, feitas pelo sistema/cron),
-- preenchido nas manuais (feitas pelo painel).
alter table public.nivel_historico
  add column usuario_id uuid references public.usuarios(id);
