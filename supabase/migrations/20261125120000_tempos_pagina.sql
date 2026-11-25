-- Diagnóstico de lentidão (Samuel, 25/11/26: trocar o filtro da Visão geral leva ~10s).
-- A página grava quanto tempo cada pedaço levou, só quando a tela demora mais de 2s,
-- pra eu achar o pedaço lento com dado real em vez de chutar. Ninguém lê isso pelo
-- painel (sem policy de leitura); a leitura é só por SQL.
create table public.tempos_pagina (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid not null references public.usuarios(id),
  pagina text not null,
  periodo text,
  total_ms integer not null,
  partes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

alter table public.tempos_pagina enable row level security;

create policy tempos_pagina_inserir on public.tempos_pagina for insert to authenticated
  with check (org_id = (select private.current_org_id()) and usuario_id = (select auth.uid()));
