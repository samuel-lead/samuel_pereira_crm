-- Atalhos de busca (índices) pras métricas "de hoje" adicionadas agora
-- (ligações, calls marcadas/realizadas, vendas). Sem isso, essas contagens
-- vão vasculhar a tabela inteira conforme o volume de leads crescer —
-- com índice, o banco pula direto pro pedaço certo.
create index if not exists interacoes_org_tipo_ocorreu_idx
  on public.interacoes (org_id, tipo, ocorreu_em);

create index if not exists interacoes_usuario_tipo_ocorreu_idx
  on public.interacoes (usuario_id, tipo, ocorreu_em);

create index if not exists reunioes_org_marcada_idx
  on public.reunioes (org_id, marcada_em);

create index if not exists reunioes_usuario_marcada_idx
  on public.reunioes (usuario_id, marcada_em);

create index if not exists reunioes_org_status_agendada_idx
  on public.reunioes (org_id, status, agendada_para);

create index if not exists leads_org_status_vendido_idx
  on public.leads (org_id, status, vendido_em);
