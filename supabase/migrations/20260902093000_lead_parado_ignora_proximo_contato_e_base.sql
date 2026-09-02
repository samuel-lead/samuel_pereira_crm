-- Duas correções a mais na regra de "lead parado" (a primeira, sobre
-- reunião marcada, já foi feita na migration anterior):
-- 1. Lead com próximo contato agendado pro futuro não é parado — é
--    óbvio que vai ficar alguns dias sem interação até a data marcada,
--    isso já está previsto, não é abandono.
-- 2. Lead na Base nunca conta como parado — Base é a fase final
--    ("passou por tudo e não virou nada"), não uma fase onde se espera
--    atividade constante. Os outros níveis de holding (ex.: Oportunidades
--    pro fim do mês) continuam contando normal.

create or replace function public.listar_notificacoes()
returns table (
  tipo text,
  lead_id uuid,
  lead_nome text,
  mensagem text,
  ocorrido_em timestamptz
)
language sql
security invoker
stable
set search_path = public
as $$
  select
    'reuniao_hoje' as tipo,
    r.lead_id,
    l.nome as lead_nome,
    (case when o.publico = 'imobiliario' then 'Visita' else 'Reunião' end) || ' hoje às ' ||
      to_char(r.agendada_para at time zone coalesce(u.timezone, 'America/Sao_Paulo'), 'HH24:MI') ||
      ' com ' || l.nome as mensagem,
    r.agendada_para as ocorrido_em
  from reunioes r
  join leads l on l.id = r.lead_id
  join usuarios u on u.id = auth.uid()
  join orgs o on o.id = u.org_id
  where r.usuario_id = auth.uid()
    and r.status = 'marcada'
    and (r.agendada_para at time zone coalesce(u.timezone, 'America/Sao_Paulo'))::date
        = (now() at time zone coalesce(u.timezone, 'America/Sao_Paulo'))::date

  union all

  select
    'reuniao_cancelada' as tipo,
    r.lead_id,
    l.nome as lead_nome,
    (case when o.publico = 'imobiliario' then 'Visita' else 'Reunião' end) ||
      ' com ' || l.nome || ' foi cancelada' as mensagem,
    r.updated_at as ocorrido_em
  from reunioes r
  join leads l on l.id = r.lead_id
  join usuarios u on u.id = auth.uid()
  join orgs o on o.id = u.org_id
  where r.usuario_id = auth.uid()
    and r.status = 'cancelada'
    and r.updated_at > now() - interval '1 day'

  union all

  select
    'contato_marcado' as tipo,
    l.id as lead_id,
    l.nome as lead_nome,
    'Contato com ' || l.nome || ' marcado pra ' ||
      to_char(l.proximo_follow_em at time zone coalesce(u.timezone, 'America/Sao_Paulo'), 'DD/MM HH24:MI') as mensagem,
    l.proximo_follow_em as ocorrido_em
  from leads l
  join usuarios u on u.id = auth.uid()
  where l.responsavel_id = auth.uid()
    and l.proximo_follow_em is not null
    and l.proximo_follow_em <= now()
    and l.status = 'ativo'
    and l.arquivado_em is null

  union all

  select
    'lead_parado' as tipo,
    l.id as lead_id,
    l.nome as lead_nome,
    l.nome || ' está parado há ' ||
      extract(day from now() - greatest(l.entrou_nivel_em, coalesce(ult.ultima_interacao, l.entrou_nivel_em)))::int ||
      ' dia(s)' as mensagem,
    greatest(l.entrou_nivel_em, coalesce(ult.ultima_interacao, l.entrou_nivel_em)) as ocorrido_em
  from leads l
  left join lateral (
    select max(i.ocorreu_em) as ultima_interacao
    from interacoes i
    where i.lead_id = l.id
  ) ult on true
  where l.responsavel_id = auth.uid()
    and l.status = 'ativo'
    and l.arquivado_em is null
    and l.nivel_ordem <> 9
    and greatest(l.entrou_nivel_em, coalesce(ult.ultima_interacao, l.entrou_nivel_em)) < now() - interval '1 day'
    and (l.proximo_follow_em is null or l.proximo_follow_em > now())
    and not exists (
      select 1 from reunioes r
      where r.lead_id = l.id and r.status = 'marcada'
    )

  order by ocorrido_em desc
  limit 50
$$;

revoke all on function public.listar_notificacoes() from public, anon;
grant execute on function public.listar_notificacoes() to authenticated;

-- Mesmas correções na função que dispara o push automático.
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
      and greatest(l.entrou_nivel_em, coalesce(ult.ultima_interacao, l.entrou_nivel_em)) < now() - interval '1 day'
      and (l.proximo_follow_em is null or l.proximo_follow_em > now())
      and not exists (
        select 1 from reunioes r
        where r.lead_id = l.id and r.status = 'marcada'
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
    end if;
  end loop;
end;
$$;

revoke all on function public.notificar_leads_parados() from public, anon, authenticated;
