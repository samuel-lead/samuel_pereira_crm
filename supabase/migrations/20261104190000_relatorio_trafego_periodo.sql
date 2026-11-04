-- Samuel (04/11/26): o relatório de tráfego ganha o filtro de período (hoje,
-- ontem, semana, mês, trimestre...). Filtra pelo dia em que o lead chegou
-- (declarado_em): o funil mostra o que aconteceu com os leads que chegaram
-- naquele período. Sem período (nulo) = todo o histórico. A função antiga
-- (só com a origem) é trocada por esta.
drop function if exists public.relatorio_trafego(text);

create or replace function public.relatorio_trafego(p_origem text, p_inicio timestamptz default null, p_fim timestamptz default null)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with
org as (select (select private.current_org_id()) as id, (select private.eh_admin()) as admin),
base as (
  select l.id, l.nome, l.declarado_em, l.nivel_ordem, l.status, l.arquivado_em, l.motivo_base,
         l.criterio_urgencia, l.criterio_capacidade,
         nullif(btrim(l.criterio_problema), '') as problema,
         l.valor_venda, l.vendido_em, l.responsavel_id
  from public.leads l, org
  where org.admin and l.org_id = org.id and l.origem = p_origem
    and (p_inicio is null or l.declarado_em >= p_inicio)
    and (p_fim is null or l.declarado_em < p_fim)
),
reun as (
  select r.lead_id, count(*) as n,
         count(*) filter (where r.status = 'realizada') as realizadas,
         count(*) filter (where r.status = 'nao_compareceu') as noshow,
         min(r.marcada_em) as primeira_marcada,
         jsonb_agg(jsonb_build_object('data', r.agendada_para, 'status', r.status) order by r.marcada_em) as lista
  from public.reunioes r
  where r.lead_id in (select id from base)
  group by r.lead_id
),
conv as (
  select distinct h.lead_id from public.nivel_historico h
  where h.lead_id in (select id from base) and h.para_ordem between 2 and 8
),
ful as (
  select b.*, u.nome as resp, n.nome as etapa,
         coalesce(r.n, 0) as n_reun, coalesce(r.realizadas, 0) as n_real, coalesce(r.noshow, 0) as n_noshow,
         r.primeira_marcada, coalesce(r.lista, '[]'::jsonb) as lista_reun,
         (b.nivel_ordem between 2 and 8 or b.status = 'vendido' or r.lead_id is not null or c.lead_id is not null) as em_conversa,
         (b.problema is not null and b.criterio_urgencia <> 'desconhecida' and b.criterio_capacidade <> 'desconhecida') as qualificado
  from base b
  left join public.usuarios u on u.id = b.responsavel_id
  left join public.niveis n on n.org_id = (select id from org) and n.ordem = b.nivel_ordem
  left join reun r on r.lead_id = b.id
  left join conv c on c.lead_id = b.id
),
meses as (
  select to_char(date_trunc('month', declarado_em at time zone 'America/Sao_Paulo'), 'YYYY-MM') as mes,
         count(*) as chegaram,
         count(*) filter (where em_conversa) as em_conversa,
         count(*) filter (where qualificado) as qualificados,
         count(*) filter (where n_reun > 0) as com_reuniao,
         count(*) filter (where n_real > 0) as realizadas,
         count(*) filter (where status = 'vendido') as vendas,
         coalesce(sum(valor_venda) filter (where status = 'vendido'), 0) as valor
  from ful group by 1
),
resps as (
  select coalesce(resp, '(sem responsável)') as resp, count(*) as leads,
         count(*) filter (where em_conversa) as em_conversa,
         count(*) filter (where qualificado) as qualificados,
         count(*) filter (where n_reun > 0) as com_reuniao,
         count(*) filter (where n_real > 0) as realizadas,
         count(*) filter (where status = 'vendido') as vendas,
         coalesce(sum(valor_venda) filter (where status = 'vendido'), 0) as valor
  from ful group by 1
),
etapas as (
  select nivel_ordem, etapa, count(*) as leads from ful where arquivado_em is null group by 1, 2
),
motivos as (
  select coalesce(motivo_base, 'sem_motivo') as motivo, count(*) as leads
  from ful where nivel_ordem = 9 and arquivado_em is null group by 1
),
origens as (
  select coalesce(l.origem, '(sem origem)') as origem, count(*) as leads
  from public.leads l, org where org.admin and l.org_id = org.id
    and (p_inicio is null or l.declarado_em >= p_inicio)
    and (p_fim is null or l.declarado_em < p_fim)
  group by 1
)
select jsonb_build_object(
  'origem', p_origem,
  'resumo', (select jsonb_build_object(
      'chegaram', count(*),
      'arquivados', count(*) filter (where arquivado_em is not null),
      'primeiroLead', min(declarado_em), 'ultimoLead', max(declarado_em),
      'emConversa', count(*) filter (where em_conversa),
      'comPerfil', count(*) filter (where problema is not null),
      'qualificados', count(*) filter (where qualificado),
      'comReuniao', count(*) filter (where n_reun > 0),
      'realizadas', count(*) filter (where n_real > 0),
      'noShow', count(*) filter (where n_noshow > 0),
      'vendas', count(*) filter (where status = 'vendido'),
      'valorVendas', coalesce(sum(valor_venda) filter (where status = 'vendido'), 0),
      'medianaDiasAteMarcar', (select round((percentile_cont(0.5) within group (order by extract(epoch from (primeira_marcada - declarado_em)) / 86400))::numeric, 1)
                               from ful where primeira_marcada is not null and primeira_marcada >= declarado_em),
      'mediaDiasAteVenda', round((avg(extract(epoch from (vendido_em - declarado_em)) / 86400) filter (where status = 'vendido' and vendido_em >= declarado_em))::numeric, 1),
      'urgencia', jsonb_build_object(
        'alta', count(*) filter (where criterio_urgencia = 'alta'), 'media', count(*) filter (where criterio_urgencia = 'media'),
        'baixa', count(*) filter (where criterio_urgencia = 'baixa'), 'desconhecida', count(*) filter (where criterio_urgencia = 'desconhecida')),
      'capacidade', jsonb_build_object(
        'sim', count(*) filter (where criterio_capacidade = 'sim'), 'parcial', count(*) filter (where criterio_capacidade = 'parcial'),
        'nao', count(*) filter (where criterio_capacidade = 'nao'), 'desconhecida', count(*) filter (where criterio_capacidade = 'desconhecida'))
    ) from ful),
  'meses', (select coalesce(jsonb_agg(to_jsonb(m) order by m.mes), '[]'::jsonb) from meses m),
  'responsaveis', (select coalesce(jsonb_agg(to_jsonb(x) order by x.leads desc), '[]'::jsonb) from resps x),
  'etapas', (select coalesce(jsonb_agg(to_jsonb(e) order by e.nivel_ordem), '[]'::jsonb) from etapas e),
  'motivosBase', (select coalesce(jsonb_agg(to_jsonb(m) order by m.leads desc), '[]'::jsonb) from motivos m),
  'origens', (select coalesce(jsonb_agg(jsonb_build_object('origem', origem, 'leads', leads) order by leads desc), '[]'::jsonb) from origens)
)
$$;

revoke all on function public.relatorio_trafego(text, timestamptz, timestamptz) from public, anon;
grant execute on function public.relatorio_trafego(text, timestamptz, timestamptz) to authenticated;
