-- Adiciona o aviso de "próximo contato marcado" nas notificações — o campo
-- proximo_follow_em já existia no banco desde o início, só não tinha
-- interface pra usar nem entrava no sino.
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
    'Reunião hoje às ' ||
      to_char(r.agendada_para at time zone coalesce(u.timezone, 'America/Sao_Paulo'), 'HH24:MI') ||
      ' com ' || l.nome as mensagem,
    r.agendada_para as ocorrido_em
  from reunioes r
  join leads l on l.id = r.lead_id
  join usuarios u on u.id = auth.uid()
  where r.usuario_id = auth.uid()
    and r.status = 'marcada'
    and (r.agendada_para at time zone coalesce(u.timezone, 'America/Sao_Paulo'))::date
        = (now() at time zone coalesce(u.timezone, 'America/Sao_Paulo'))::date

  union all

  select
    'reuniao_cancelada' as tipo,
    r.lead_id,
    l.nome as lead_nome,
    'Reunião com ' || l.nome || ' foi cancelada' as mensagem,
    r.updated_at as ocorrido_em
  from reunioes r
  join leads l on l.id = r.lead_id
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
    and greatest(l.entrou_nivel_em, coalesce(ult.ultima_interacao, l.entrou_nivel_em)) < now() - interval '1 day'

  order by ocorrido_em desc
  limit 50
$$;

revoke all on function public.listar_notificacoes() from public, anon;
grant execute on function public.listar_notificacoes() to authenticated;
