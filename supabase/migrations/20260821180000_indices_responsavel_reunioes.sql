-- Hoje as métricas por SDR passaram a filtrar lead pelo responsável atual
-- (responsavel_id), não por quem cadastrou (usuario_id) — e reuniões
-- passaram a ser filtradas via join com o lead responsável, não mais
-- direto por reunioes.usuario_id. Isso deixou dois caminhos sem índice
-- bom: o join leads->reunioes (não existia índice em reunioes.lead_id) e
-- o filtro leads por responsável + data de declaração.

create index if not exists reunioes_lead_id_idx
  on public.reunioes using btree (lead_id);

create index if not exists leads_responsavel_declarado_idx
  on public.leads using btree (responsavel_id, declarado_em);
