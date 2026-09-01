-- Liga os 3 avisos automáticos de verdade (push no celular): lead novo
-- atribuído, contato marcado que venceu, e lead parado sem interação.
-- Reaproveita as mesmas condições que já existiam em listar_notificacoes()
-- (o sininho do painel), só que aqui a gente detecta e MANDA o push, em
-- vez de só listar quando alguém abre o painel.

create extension if not exists pg_net;

-- Guarda o que já foi avisado, pra nunca mandar o mesmo aviso duas vezes.
-- "chave" muda quando é um evento novo de verdade (ex: um novo horário de
-- contato marcado) — assim o mesmo lead pode avisar de novo no futuro,
-- sem repetir o aviso de um evento que já foi mandado.
create table push_notificacoes_enviadas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id),
  usuario_id uuid not null references usuarios(id),
  lead_id uuid not null references leads(id),
  tipo text not null check (tipo in ('lead_novo', 'contato_vencido', 'lead_parado')),
  chave text not null default '',
  enviado_em timestamptz not null default now(),
  unique (usuario_id, lead_id, tipo, chave)
);

alter table push_notificacoes_enviadas enable row level security;

-- Chama a Edge Function enviar-push pra um usuário específico. O segredo
-- de autenticação fica guardado no Vault (não em texto no código) —
-- precisa ser criado uma vez com:
--   select vault.create_secret('...', 'push_internal_secret');
-- e o mesmo valor colado nas Secrets da Edge Function como
-- PUSH_INTERNAL_SECRET. Se o segredo ainda não existir, só não manda
-- nada (não quebra o cron).
create or replace function private.chamar_enviar_push(
  p_usuario_id uuid,
  p_titulo text,
  p_corpo text,
  p_url text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_segredo text;
begin
  select decrypted_secret into v_segredo
  from vault.decrypted_secrets
  where name = 'push_internal_secret';

  if v_segredo is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://hgloheptxqdjpwzgquku.supabase.co/functions/v1/enviar-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_segredo
    ),
    body := jsonb_build_object(
      'usuario_id', p_usuario_id,
      'titulo', p_titulo,
      'corpo', p_corpo,
      'url', p_url
    )
  );
end;
$$;

revoke all on function private.chamar_enviar_push(uuid, text, text, text) from public, anon, authenticated;

-- 1) Lead novo — dispara assim que um lead ganha responsável (seja na
-- criação ou quando é atribuído depois).
create or replace function public.notificar_lead_atribuido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linhas int;
begin
  if new.responsavel_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.responsavel_id is not distinct from new.responsavel_id then
    return new;
  end if;

  insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
  values (new.org_id, new.responsavel_id, new.id, 'lead_novo', '')
  on conflict do nothing;

  get diagnostics v_linhas = row_count;

  if v_linhas > 0 then
    perform private.chamar_enviar_push(
      new.responsavel_id,
      'Lead novo',
      new.nome || ' acabou de ser atribuído a você',
      '/leads/' || new.id
    );
  end if;

  return new;
end;
$$;

create trigger trigger_notificar_lead_atribuido
  after insert or update of responsavel_id on leads
  for each row
  execute function public.notificar_lead_atribuido();

-- 2) Contato marcado que venceu — roda de 15 em 15 min.
create or replace function public.notificar_contatos_vencidos()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead record;
  v_linhas int;
begin
  for v_lead in
    select l.id, l.org_id, l.nome, l.responsavel_id, l.proximo_follow_em
    from leads l
    where l.responsavel_id is not null
      and l.proximo_follow_em is not null
      and l.proximo_follow_em <= now()
      and l.status = 'ativo'
      and l.arquivado_em is null
  loop
    insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
    values (v_lead.org_id, v_lead.responsavel_id, v_lead.id, 'contato_vencido', v_lead.proximo_follow_em::text)
    on conflict do nothing;

    get diagnostics v_linhas = row_count;

    if v_linhas > 0 then
      perform private.chamar_enviar_push(
        v_lead.responsavel_id,
        'Contato venceu',
        'Contato com ' || v_lead.nome || ' tava marcado pra agora',
        '/leads/' || v_lead.id
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.notificar_contatos_vencidos() from public, anon, authenticated;

select cron.schedule(
  'notificar-contatos-vencidos',
  '*/15 * * * *',
  $$select public.notificar_contatos_vencidos()$$
);

-- 3) Lead parado — sem interação há mais de 1 dia. Roda de 15 em 15 min,
-- mas só reavisa quando o "parado desde" muda (ou seja, quando teve uma
-- interação nova e depois esfriou de novo).
create or replace function public.notificar_leads_parados()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead record;
  v_linhas int;
begin
  for v_lead in
    select
      l.id,
      l.org_id,
      l.nome,
      l.responsavel_id,
      greatest(l.entrou_nivel_em, coalesce(ult.ultima_interacao, l.entrou_nivel_em)) as parado_desde
    from leads l
    left join lateral (
      select max(i.ocorreu_em) as ultima_interacao
      from interacoes i
      where i.lead_id = l.id
    ) ult on true
    where l.responsavel_id is not null
      and l.status = 'ativo'
      and l.arquivado_em is null
      and greatest(l.entrou_nivel_em, coalesce(ult.ultima_interacao, l.entrou_nivel_em)) < now() - interval '1 day'
  loop
    insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
    values (v_lead.org_id, v_lead.responsavel_id, v_lead.id, 'lead_parado', v_lead.parado_desde::text)
    on conflict do nothing;

    get diagnostics v_linhas = row_count;

    if v_linhas > 0 then
      perform private.chamar_enviar_push(
        v_lead.responsavel_id,
        'Lead parado',
        v_lead.nome || ' tá sem interação há mais de 1 dia',
        '/leads/' || v_lead.id
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.notificar_leads_parados() from public, anon, authenticated;

select cron.schedule(
  'notificar-leads-parados',
  '*/15 * * * *',
  $$select public.notificar_leads_parados()$$
);
