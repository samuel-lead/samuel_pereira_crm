-- Fase 1 do agente do WhatsApp: guarda a ação que o agente propôs (ex.:
-- "registrar nota") e está esperando confirmação ("sim"/"não") de quem
-- mandou a mensagem. Toda escrita vinda do WhatsApp passa por aqui antes
-- de gravar de verdade (eco de confirmação, regra do CLAUDE.md). Só a
-- Edge Function (service_role) escreve nessa tabela.

create table public.agente_pendencias (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid not null unique references public.usuarios(id),
  lead_id uuid not null references public.leads(id),
  tipo text not null default 'registrar_nota' check (tipo in ('registrar_nota')),
  conteudo text not null,
  resumo text not null,
  criado_em timestamptz not null default now()
);

alter table public.agente_pendencias enable row level security;

create policy "agente_pendencias_select_org" on public.agente_pendencias
  for select
  using (org_id = private.current_org_id());
