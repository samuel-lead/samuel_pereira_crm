-- Samuel pediu um padrão visual único pra todo lembrete de WhatsApp:
-- emoji + título em destaque (negrito) no topo, depois nome/origem/hora
-- que entrou do lead, e por fim um link direto pro WhatsApp do lead (pra
-- quem recebe o aviso já clicar e falar com ele). E só de segunda a
-- sexta — fim de semana não manda nada.

-- Template compartilhado — evita repetir a mesma montagem de texto em
-- cada função de aviso. `p_extra` é uma linha a mais, específica de cada
-- tipo de aviso (ex.: horário da reunião), opcional.
create or replace function private.formatar_lembrete_lead(
  p_emoji text,
  p_titulo text,
  p_nome text,
  p_origem text,
  p_entrou_em timestamptz,
  p_telefone text,
  p_extra text default null
) returns text
language sql
immutable
as $$
  select
    p_emoji || ' *' || upper(p_titulo) || '*' || E'\n\n' ||
    '👤 ' || p_nome || E'\n' ||
    '📍 Origem: ' || coalesce(p_origem, 'não informada') || E'\n' ||
    '🕐 Entrou: ' || to_char(p_entrou_em at time zone 'America/Sao_Paulo', 'DD/MM às HH24:MI') ||
    coalesce(E'\n' || p_extra, '') || E'\n\n' ||
    '💬 Falar no WhatsApp: https://wa.me/' || regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g')
$$;

revoke all on function private.formatar_lembrete_lead(text, text, text, text, timestamptz, text, text) from public, anon, authenticated;

-- 1) Lead novo — usa o template novo.
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
      new.nome || ' acabou de ser atribuído a você. Origem: ' || coalesce(new.origem, 'não informada'),
      '/leads/' || new.id
    );
    perform private.chamar_enviar_whatsapp(
      new.responsavel_id,
      private.formatar_lembrete_lead('🆕', 'Lead novo', new.nome, new.origem, new.declarado_em, new.telefone_e164)
    );
  end if;

  return new;
end;
$$;

-- 2) Lead sem responsável — mesma lógica, template novo.
create or replace function public.notificar_lead_sem_responsavel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario record;
  v_linhas int;
begin
  if new.responsavel_id is not null or new.nivel_ordem <> 0 then
    return new;
  end if;

  for v_usuario in
    select id from usuarios where org_id = new.org_id
  loop
    insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
    values (new.org_id, v_usuario.id, new.id, 'lead_sem_responsavel', '')
    on conflict do nothing;

    get diagnostics v_linhas = row_count;

    if v_linhas > 0 then
      perform private.chamar_enviar_push(
        v_usuario.id,
        'Novo lead sem responsável',
        new.nome || ' caiu em "Novos Leads" sem responsável. Origem: ' || coalesce(new.origem, 'não informada'),
        '/leads/' || new.id
      );
      perform private.chamar_enviar_whatsapp(
        v_usuario.id,
        private.formatar_lembrete_lead('🆘', 'Lead sem responsável', new.nome, new.origem, new.declarado_em, new.telefone_e164)
      );
    end if;
  end loop;

  return new;
end;
$$;

-- 3) Contato atrasado — de 15 em 15 min, só seg-sex.
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
    select l.id, l.org_id, l.nome, l.responsavel_id, l.proximo_follow_em, l.origem, l.telefone_e164, l.declarado_em
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
      perform private.chamar_enviar_whatsapp(
        v_lead.responsavel_id,
        private.formatar_lembrete_lead('⏰', 'Contato atrasado', v_lead.nome, v_lead.origem, v_lead.declarado_em, v_lead.telefone_e164)
      );
    end if;
  end loop;
end;
$$;

select cron.unschedule('notificar-contatos-vencidos');
select cron.schedule(
  'notificar-contatos-vencidos',
  '*/15 * * * 1-5',
  $$select public.notificar_contatos_vencidos()$$
);

-- 4) Lead parado — mesma coisa, agora só seg-sex.
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
      l.origem,
      l.telefone_e164,
      l.declarado_em,
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
      and l.nivel_ordem <> 9
      and not l.oportunidade_futura
      and greatest(l.entrou_nivel_em, coalesce(ult.ultima_interacao, l.entrou_nivel_em)) < now() - interval '1 day'
      and (l.proximo_follow_em is null or l.proximo_follow_em > now())
      and not exists (
        select 1 from reunioes r
        where r.lead_id = l.id and r.status = 'marcada' and r.agendada_para > now()
      )
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
      perform private.chamar_enviar_whatsapp(
        v_lead.responsavel_id,
        private.formatar_lembrete_lead('🔴', 'Lead parado', v_lead.nome, v_lead.origem, v_lead.declarado_em, v_lead.telefone_e164)
      );
    end if;
  end loop;
end;
$$;

select cron.unschedule('notificar-leads-parados');
select cron.schedule(
  'notificar-leads-parados',
  '*/15 * * * 1-5',
  $$select public.notificar_leads_parados()$$
);

-- 5) Reunião chegando — template novo, com o horário da reunião como
-- linha extra, e agora só seg-sex.
create or replace function public.notificar_reunioes_em_breve()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reuniao record;
  v_destinatario uuid;
  v_linhas int;
begin
  for v_reuniao in
    select
      r.id, r.org_id, r.lead_id, r.usuario_id, r.closer_id, r.agendada_para,
      l.nome as lead_nome, l.origem, l.telefone_e164, l.declarado_em
    from reunioes r
    join leads l on l.id = r.lead_id
    where r.status = 'marcada'
      and r.agendada_para > now()
      and r.agendada_para <= now() + interval '1 hour'
  loop
    v_destinatario := coalesce(v_reuniao.closer_id, v_reuniao.usuario_id);
    if v_destinatario is null then
      continue;
    end if;

    insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
    values (v_reuniao.org_id, v_destinatario, v_reuniao.lead_id, 'reuniao_em_breve', v_reuniao.id::text)
    on conflict do nothing;

    get diagnostics v_linhas = row_count;

    if v_linhas > 0 then
      perform private.chamar_enviar_whatsapp(
        v_destinatario,
        private.formatar_lembrete_lead(
          '📅', 'Reunião chegando', v_reuniao.lead_nome, v_reuniao.origem, v_reuniao.declarado_em, v_reuniao.telefone_e164,
          '📍 Reunião às ' || to_char(v_reuniao.agendada_para at time zone 'America/Sao_Paulo', 'HH24:MI')
        )
      );
    end if;
  end loop;
end;
$$;

select cron.unschedule('notificar-reunioes-em-breve');
select cron.schedule(
  'notificar-reunioes-em-breve',
  '*/15 * * * 1-5',
  $$select public.notificar_reunioes_em_breve()$$
);

-- 6) NOVO: Reunião atrasada — reunião marcada cujo horário já passou (ou
-- lead que ficou em No-show/Precisa reagendar), mesma regra de quem
-- aparece no card "Reuniões atrasadas" do dashboard. Roda de 15 em 15
-- min, só seg-sex, reavisa quando a situação muda (nível ou data da
-- última reunião mudam).
alter table push_notificacoes_enviadas
  drop constraint push_notificacoes_enviadas_tipo_check;
alter table push_notificacoes_enviadas
  add constraint push_notificacoes_enviadas_tipo_check
  check (tipo in (
    'lead_novo', 'contato_vencido', 'lead_parado', 'lead_sem_responsavel',
    'reuniao_em_breve', 'reuniao_atrasada'
  ));

create or replace function public.notificar_reunioes_atrasadas()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead record;
  v_destinatario uuid;
  v_linhas int;
begin
  for v_lead in
    select
      l.id, l.org_id, l.nome, l.responsavel_id, l.origem, l.telefone_e164, l.declarado_em, l.nivel_ordem,
      (select r.agendada_para from reunioes r where r.lead_id = l.id order by r.marcada_em desc limit 1) as ultima_reuniao
    from leads l
    where l.responsavel_id is not null
      and l.status = 'ativo'
      and l.arquivado_em is null
      and l.nivel_ordem in (4, 5, 6) -- Reunião marcada, No-show, Precisa reagendar
  loop
    -- "Reunião marcada" só conta como atrasada se a data já passou — se
    -- ainda está por vir, é uma reunião futura normal (já cobre o aviso
    -- "Reunião chegando" separado), não uma que já devia ter acontecido.
    if v_lead.nivel_ordem = 4 and (v_lead.ultima_reuniao is null or v_lead.ultima_reuniao >= now()) then
      continue;
    end if;

    v_destinatario := v_lead.responsavel_id;

    insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
    values (
      v_lead.org_id, v_destinatario, v_lead.id, 'reuniao_atrasada',
      v_lead.nivel_ordem::text || ':' || coalesce(v_lead.ultima_reuniao::text, 'sem_reuniao')
    )
    on conflict do nothing;

    get diagnostics v_linhas = row_count;

    if v_linhas > 0 then
      perform private.chamar_enviar_whatsapp(
        v_destinatario,
        private.formatar_lembrete_lead(
          '⚠️', 'Reunião atrasada', v_lead.nome, v_lead.origem, v_lead.declarado_em, v_lead.telefone_e164,
          case when v_lead.ultima_reuniao is not null
            then '📍 Estava marcada pra ' || to_char(v_lead.ultima_reuniao at time zone 'America/Sao_Paulo', 'DD/MM às HH24:MI')
            else null
          end
        )
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.notificar_reunioes_atrasadas() from public, anon, authenticated;

select cron.schedule(
  'notificar-reunioes-atrasadas',
  '*/15 * * * 1-5',
  $$select public.notificar_reunioes_atrasadas()$$
);
