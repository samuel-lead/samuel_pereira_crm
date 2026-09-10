-- Índices faltando em chaves estrangeiras bem usadas (achado pelo linter
-- de performance do Supabase, enquanto investigava lentidão reportada por
-- Samuel e clientes) — sem índice, toda consulta que filtra por essas
-- colunas varre a tabela inteira. reunioes.closer_id e
-- nivel_historico.lead_id/org_id são consultadas o tempo todo pelo
-- Kanban e pelo card do lead.
create index if not exists reunioes_closer_id_idx on public.reunioes (closer_id);
create index if not exists nivel_historico_lead_id_idx on public.nivel_historico (lead_id);
create index if not exists nivel_historico_org_id_idx on public.nivel_historico (org_id);
create index if not exists leads_isca_id_idx on public.leads (isca_id);
