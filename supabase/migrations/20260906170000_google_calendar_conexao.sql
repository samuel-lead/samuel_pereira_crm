-- Guarda a conexão OAuth do Google Calendar — uma por org (a agenda do
-- Samuel/admin que conectou, não uma por vendedor). Nunca exposta pro
-- client: sem nenhuma policy de RLS, só uma Edge Function com
-- service_role consegue ler/escrever aqui.
create table google_calendar_conexoes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references orgs(id),
  access_token text not null,
  refresh_token text not null,
  expira_em timestamptz not null,
  calendar_id text not null default 'primary',
  conectado_por uuid references usuarios(id),
  conectado_em timestamptz not null default now()
);

alter table google_calendar_conexoes enable row level security;

-- Guarda o evento criado na Google Agenda pra cada reunião — sem isso,
-- não tem como atualizar/cancelar o evento certo depois (reagendamento,
-- No-show etc).
alter table reunioes add column google_event_id text;
