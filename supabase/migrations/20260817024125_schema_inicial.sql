-- Fase 1, Tarefa 1.1 — schema inicial: 11 tabelas, RLS por org_id, triggers de updated_at

create extension if not exists pgcrypto;

-- ============================================================
-- orgs
-- ============================================================
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  vocabulario_encontro text not null default 'reunião',
  criterio_1_label text not null default 'Qual é o problema dele',
  criterio_2_label text not null default 'Tem urgência em resolver',
  criterio_3_label text not null default 'Consegue pagar a solução',
  ticket_medio_padrao numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- usuarios
-- ============================================================
create table public.usuarios (
  id uuid primary key references auth.users(id),
  org_id uuid not null references public.orgs(id),
  nome text not null,
  wpp_assistente_e164 text,
  wpp_comercial_e164 text,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- função auxiliar: org do usuário autenticado (precisa que usuarios já exista)
create or replace function public.current_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from public.usuarios where id = auth.uid()
$$;

-- função auxiliar: mantém updated_at em dia
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- RLS + trigger de orgs e usuarios, agora que current_org_id() já existe
alter table public.orgs enable row level security;

create trigger trg_set_updated_at
  before update on public.orgs
  for each row execute function public.set_updated_at();

create policy "orgs_por_org" on public.orgs
  for all
  using (id = public.current_org_id())
  with check (id = public.current_org_id());

alter table public.usuarios enable row level security;

create trigger trg_set_updated_at
  before update on public.usuarios
  for each row execute function public.set_updated_at();

create policy "usuarios_por_org" on public.usuarios
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- ============================================================
-- metas_config
-- ============================================================
create table public.metas_config (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid not null references public.usuarios(id),
  piso_leads_dia int not null default 30,
  piso_reunioes_dia int not null default 3,
  taxa_agendamento_min numeric not null default 0.10,
  taxa_comparecimento_min numeric not null default 0.80,
  taxa_venda_min numeric not null default 0.40,
  vigente_desde date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.metas_config enable row level security;

create trigger trg_set_updated_at
  before update on public.metas_config
  for each row execute function public.set_updated_at();

create policy "metas_config_por_org" on public.metas_config
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- ============================================================
-- metas_mensais
-- ============================================================
create table public.metas_mensais (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid not null references public.usuarios(id),
  ano int not null,
  mes int not null,
  meta_receita numeric,
  meta_vendas int,
  ticket_medio numeric not null,
  dias_uteis int not null,
  vendas_necessarias int,
  reunioes_realizadas_necessarias int,
  reunioes_marcadas_necessarias int,
  leads_necessarios int,
  meta_leads_dia_derivada int,
  meta_leads_dia_efetiva int,
  travada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usuario_id, ano, mes)
);

alter table public.metas_mensais enable row level security;

create trigger trg_set_updated_at
  before update on public.metas_mensais
  for each row execute function public.set_updated_at();

create policy "metas_mensais_por_org" on public.metas_mensais
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- ============================================================
-- niveis
-- ============================================================
create table public.niveis (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  ordem int not null check (ordem between 1 and 6),
  nome text not null,
  definicao text not null,
  prazo_dias int,
  destino_ao_estourar int,
  etiqueta_wpp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, ordem)
);

alter table public.niveis enable row level security;

create trigger trg_set_updated_at
  before update on public.niveis
  for each row execute function public.set_updated_at();

create policy "niveis_por_org" on public.niveis
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- ============================================================
-- leads
-- ============================================================
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid not null references public.usuarios(id),
  nome text not null,
  telefone_e164 text,
  origem text,
  nivel_ordem int not null default 1,
  criterio_problema text,
  criterio_urgencia text not null default 'desconhecida'
    check (criterio_urgencia in ('alta','media','baixa','desconhecida')),
  criterio_capacidade text not null default 'desconhecida'
    check (criterio_capacidade in ('sim','nao','parcial','desconhecida')),
  qualificado_em timestamptz,
  declarado_em timestamptz not null default now(),
  entrou_nivel_em timestamptz not null default now(),
  ultimo_contato_em timestamptz,
  proximo_follow_em timestamptz,
  status text not null default 'ativo' check (status in ('ativo','vendido','perdido')),
  valor_venda numeric,
  vendido_em timestamptz,
  arquivado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usuario_id, telefone_e164)
);

alter table public.leads enable row level security;

create trigger trg_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create policy "leads_por_org" on public.leads
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create index leads_usuario_follow_idx on public.leads (usuario_id, proximo_follow_em);
create index leads_usuario_nivel_idx on public.leads (usuario_id, nivel_ordem);
create index leads_usuario_declarado_idx on public.leads (usuario_id, declarado_em);

-- ============================================================
-- nivel_historico
-- ============================================================
create table public.nivel_historico (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  lead_id uuid not null references public.leads(id),
  de_ordem int,
  para_ordem int not null,
  motivo text,
  automatico boolean not null default false,
  ocorreu_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nivel_historico enable row level security;

create trigger trg_set_updated_at
  before update on public.nivel_historico
  for each row execute function public.set_updated_at();

create policy "nivel_historico_por_org" on public.nivel_historico
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- ============================================================
-- interacoes
-- ============================================================
create table public.interacoes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid not null references public.usuarios(id),
  lead_id uuid not null references public.leads(id),
  tipo text check (tipo in ('mensagem','ligacao','reuniao','nota')),
  direcao text check (direcao in ('entrada','saida')),
  canal text check (canal in ('A','B','manual')),
  conteudo text,
  ocorreu_em timestamptz not null,
  origem text check (origem in ('observado','declarado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.interacoes enable row level security;

create trigger trg_set_updated_at
  before update on public.interacoes
  for each row execute function public.set_updated_at();

create policy "interacoes_por_org" on public.interacoes
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create index interacoes_lead_ocorreu_idx on public.interacoes (lead_id, ocorreu_em desc);

-- ============================================================
-- reunioes
-- ============================================================
create table public.reunioes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid not null references public.usuarios(id),
  lead_id uuid not null references public.leads(id),
  agendada_para timestamptz not null,
  status text not null default 'marcada'
    check (status in ('marcada','realizada','nao_compareceu','cancelada')),
  resultado text check (resultado in ('vendeu','nao_vendeu','remarcou')),
  valor numeric,
  qualificada boolean not null default true,
  justificativa_forcada text,
  marcada_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reunioes enable row level security;

create trigger trg_set_updated_at
  before update on public.reunioes
  for each row execute function public.set_updated_at();

create policy "reunioes_por_org" on public.reunioes
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create index reunioes_usuario_agendada_idx on public.reunioes (usuario_id, agendada_para);

-- ============================================================
-- mensagens_brutas
-- ============================================================
create table public.mensagens_brutas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  canal text not null check (canal in ('A','B')),
  provider_message_id text not null unique,
  telefone_e164 text,
  payload jsonb not null,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mensagens_brutas enable row level security;

create trigger trg_set_updated_at
  before update on public.mensagens_brutas
  for each row execute function public.set_updated_at();

create policy "mensagens_brutas_por_org" on public.mensagens_brutas
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create index mensagens_brutas_pendentes_idx on public.mensagens_brutas (processado_em)
  where processado_em is null;

-- ============================================================
-- comandos
-- ============================================================
create table public.comandos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id),
  usuario_id uuid not null references public.usuarios(id),
  mensagem_bruta_id uuid references public.mensagens_brutas(id),
  texto_original text,
  transcricao text,
  intencao text,
  ferramentas jsonb,
  resposta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comandos enable row level security;

create trigger trg_set_updated_at
  before update on public.comandos
  for each row execute function public.set_updated_at();

create policy "comandos_por_org" on public.comandos
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());
