-- Samuel pediu pra reforçar os avisos automáticos (que já existiam só
-- como push do navegador — 20260901120000_push_notificacoes_automaticas.sql
-- e 20260905180000_..._sem_responsavel.sql — mas "não tava prestando")
-- com WhatsApp, que ele realmente olha. Sem nenhuma IA envolvida aqui —
-- tudo é consulta em SQL + template de texto, igual a regra do projeto
-- (métrica é sempre calculada em SQL). Adiciona também dois avisos novos:
-- reunião chegando e relatório do fim do dia.
--
-- Importante: as 4 funções de notificação abaixo já tinham sido refinadas
-- depois da criação original (detalhes no "lead novo", exclusões no "lead
-- parado") — recriadas aqui com o texto ATUAL de cada uma (conferido ao
-- vivo no banco), só acrescentando a chamada de WhatsApp. Não é pra voltar
-- nenhuma regra antiga.

create or replace function private.chamar_enviar_whatsapp(
  p_usuario_id uuid,
  p_mensagem text
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
    url := 'https://hgloheptxqdjpwzgquku.supabase.co/functions/v1/enviar-whatsapp-interno',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_segredo
    ),
    body := jsonb_build_object(
      'usuario_id', p_usuario_id,
      'mensagem', p_mensagem
    )
  );
end;
$$;

revoke all on function private.chamar_enviar_whatsapp(uuid, text) from public, anon, authenticated;

create or replace function public.notificar_lead_atribuido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linhas int;
  v_nivel_nome text;
  v_qualificacao text;
  v_detalhes text;
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
    select nome into v_nivel_nome from niveis where ordem = new.nivel_ordem;

    select nivel_qualificacao into v_qualificacao
    from isca_respostas
    where lead_id = new.id
    order by created_at desc
    limit 1;

    v_detalhes := 'Origem: ' || coalesce(new.origem, 'não informada');

    if v_qualificacao is not null then
      v_detalhes := v_detalhes || ' · ' || (
        case v_qualificacao
          when 'super_qualificado' then 'Super qualificado'
          when 'qualificado' then 'Qualificado'
          when 'desqualificado' then 'Desqualificado'
          else v_qualificacao
        end
      );
    end if;

    if v_nivel_nome is not null then
      v_detalhes := v_detalhes || ' · ' || v_nivel_nome;
    end if;

    perform private.chamar_enviar_push(
      new.responsavel_id,
      'Lead novo',
      new.nome || ' acabou de ser atribuído a você. ' || v_detalhes,
      '/leads/' || new.id
    );
    perform private.chamar_enviar_whatsapp(
      new.responsavel_id,
      'Lead novo: ' || new.nome || ' acabou de ser atribuído a você. ' || v_detalhes
    );
  end if;

  return new;
end;
$$;

create or replace function public.notificar_lead_sem_responsavel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario record;
  v_linhas int;
  v_nivel_nome text;
begin
  if new.responsavel_id is not null or new.nivel_ordem <> 0 then
    return new;
  end if;

  select nome into v_nivel_nome from niveis where ordem = new.nivel_ordem;

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
        new.nome || ' caiu em "Novos Leads" sem responsável. Origem: ' ||
          coalesce(new.origem, 'não informada'),
        '/leads/' || new.id
      );
      perform private.chamar_enviar_whatsapp(
        v_usuario.id,
        'Lead sem responsável: ' || new.nome || ' caiu em "Novos Leads" sem ninguém pra cuidar. Origem: ' ||
          coalesce(new.origem, 'não informada')
      );
    end if;
  end loop;

  return new;
end;
$$;

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
      perform private.chamar_enviar_whatsapp(
        v_lead.responsavel_id,
        'Contato atrasado: o contato com ' || v_lead.nome || ' tava marcado pra agora e ainda não foi feito.'
      );
    end if;
  end loop;
end;
$$;

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
        'Lead parado: ' || v_lead.nome || ' tá sem interação há mais de 1 dia.'
      );
    end if;
  end loop;
end;
$$;

-- Aviso novo: reunião chegando (dentro da próxima 1h). Reaproveita a
-- mesma tabela de "já avisado" de cima — toda reunião tem lead_id, e a
-- chave (id da própria reunião) garante um aviso por reunião, nunca
-- repetido, mesmo rodando de 15 em 15 min.
alter table push_notificacoes_enviadas
  drop constraint push_notificacoes_enviadas_tipo_check;
alter table push_notificacoes_enviadas
  add constraint push_notificacoes_enviadas_tipo_check
  check (tipo in ('lead_novo', 'contato_vencido', 'lead_parado', 'lead_sem_responsavel', 'reuniao_em_breve'));

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
    select r.id, r.org_id, r.lead_id, r.usuario_id, r.closer_id, r.agendada_para, l.nome as lead_nome
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
        'Reunião chegando: com ' || v_reuniao.lead_nome || ' às ' ||
          to_char(v_reuniao.agendada_para at time zone 'America/Sao_Paulo', 'HH24:MI') || '.'
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.notificar_reunioes_em_breve() from public, anon, authenticated;

select cron.schedule(
  'notificar-reunioes-em-breve',
  '*/15 * * * *',
  $$select public.notificar_reunioes_em_breve()$$
);

-- Aviso novo: relatório do fim do dia, uma vez por dia útil, 18h de
-- Brasília (21h UTC), pra cada usuário com número de WhatsApp cadastrado.
create or replace function public.enviar_relatorio_diario()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario record;
  v_leads_novos int;
  v_reunioes_marcadas int;
  v_reunioes_realizadas int;
  v_vendas int;
begin
  for v_usuario in
    select id, nome from usuarios where wpp_comercial_e164 is not null
  loop
    select count(*) into v_leads_novos
    from leads
    where responsavel_id = v_usuario.id
      and declarado_em::date = current_date;

    select count(*) into v_reunioes_marcadas
    from reunioes
    where (usuario_id = v_usuario.id or closer_id = v_usuario.id)
      and marcada_em::date = current_date;

    select count(*) into v_reunioes_realizadas
    from reunioes
    where (usuario_id = v_usuario.id or closer_id = v_usuario.id)
      and status = 'realizada'
      and agendada_para::date = current_date;

    select count(*) into v_vendas
    from leads
    where responsavel_id = v_usuario.id
      and status = 'vendido'
      and vendido_em::date = current_date;

    if v_leads_novos = 0 and v_reunioes_marcadas = 0 and v_reunioes_realizadas = 0 and v_vendas = 0 then
      continue;
    end if;

    perform private.chamar_enviar_whatsapp(
      v_usuario.id,
      'Resumo do dia: ' || v_leads_novos || ' lead(s) novo(s), ' ||
        v_reunioes_marcadas || ' reunião(ões) marcada(s), ' ||
        v_reunioes_realizadas || ' realizada(s), ' ||
        v_vendas || ' venda(s).'
    );
  end loop;
end;
$$;

revoke all on function public.enviar_relatorio_diario() from public, anon, authenticated;

select cron.schedule(
  'enviar-relatorio-diario',
  '0 21 * * 1-5',
  $$select public.enviar_relatorio_diario()$$
);
