-- Samuel (28/10/26): histórico de pedidos fechados da Inove Gôndolas
-- (planilha "PEDIDOS COMERCIAL FECHADOS", jan/2018 a out/2026) dentro do CRM,
-- numa página própria do painel ("Histórico de vendas").
--
-- Cada linha é um pedido da planilha. "conta" é o nome do cliente já
-- padronizado na importação (ex.: todas as filiais da Big Lar viram uma conta
-- só) e "canal" separa revenda/rede dos clientes diretos. A tabela é só de
-- leitura pelo painel: a importação é feita pelo time técnico, ninguém edita
-- pela tela. Só admin da própria empresa enxerga.

create table public.historico_pedidos (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.orgs(id),
  mes_ref date not null,                 -- 1º dia do mês do fechamento
  pedido text,
  cliente text not null,                 -- nome como está na planilha
  conta text not null,                   -- nome padronizado (agrupa o mesmo cliente)
  canal text not null,                   -- canal do pedido
  canal_conta text not null,             -- canal da conta (do 1º pedido dela)
  vendedor text not null,
  receita numeric(14, 2) not null default 0,
  data_fechamento date,
  data_entrega date,
  origem text not null default 'planilha',
  criado_em timestamptz not null default now()
);

create index historico_pedidos_org_mes on public.historico_pedidos (org_id, mes_ref);

alter table public.historico_pedidos enable row level security;

create policy historico_pedidos_select_admin on public.historico_pedidos for select
  using (org_id = (select private.current_org_id()) and (select private.eh_admin()));

revoke all on public.historico_pedidos from anon;
grant select on public.historico_pedidos to authenticated;

-- Todas as métricas da página saem daqui (regra: métrica é calculada em SQL).
-- Roda com a permissão de quem chama, então a RLS acima vale: quem não é
-- admin recebe tudo vazio.
create or replace function public.historico_vendas_resumo()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with
v as (
  select * from public.historico_pedidos
  where org_id = (select private.current_org_id()) and receita > 0
),
contas as (
  select conta, min(canal_conta) as canal, count(*) as pedidos, sum(receita) as receita,
         min(mes_ref) as primeiro, max(mes_ref) as ultimo,
         ((extract(year from max(mes_ref)) - extract(year from min(mes_ref))) * 12
           + extract(month from max(mes_ref)) - extract(month from min(mes_ref)) + 1)::int as vida
  from v group by conta
),
dc as (select * from contas where canal = 'Demais clientes'),
limites as (select min(mes_ref) as ini, max(mes_ref) as fim from v),
meses as (
  select gs::date as mes_ref
  from limites, generate_series(limites.ini, limites.fim, interval '1 month') gs
),
mensal_base as (
  select m.mes_ref,
         count(v.id) as pedidos,
         coalesce(sum(v.receita), 0) as receita,
         (select count(*) from dc where dc.primeiro = m.mes_ref) as novos
  from meses m left join v on v.mes_ref = m.mes_ref
  group by m.mes_ref
),
mensal as (
  select mes_ref, pedidos, receita, novos,
         case when pedidos > 0 then receita / pedidos end as ticket,
         lag(receita, 1) over w as receita_mes_anterior,
         lag(receita, 12) over w as receita_ano_anterior,
         lag(pedidos, 12) over w as pedidos_ano_anterior
  from mensal_base window w as (order by mes_ref)
),
anual as (
  select extract(year from v.mes_ref)::int as ano, count(*) as pedidos, sum(receita) as receita,
         avg(receita) as ticket_medio,
         percentile_cont(0.5) within group (order by receita) as ticket_mediano,
         count(distinct v.mes_ref) as meses,
         count(distinct conta) filter (where canal_conta = 'Demais clientes') as clientes_ativos
  from v group by 1
),
anual_full as (
  select a.*,
         (select count(*) from dc where extract(year from dc.primeiro) = a.ano) as novos,
         lag(a.receita) over (order by a.ano) as receita_ano_anterior
  from anual a
),
canais as (
  select canal, count(*) as pedidos, sum(receita) as receita, avg(receita) as ticket_medio,
         percentile_cont(0.5) within group (order by receita) as ticket_mediano
  from v group by canal
),
faixas_base as (
  select v.*,
         case when receita <= 1000 then 1 when receita <= 5000 then 2 when receita <= 20000 then 3
              when receita <= 100000 then 4 else 5 end as faixa,
         case when data_fechamento is not null and data_entrega is not null
                   and data_entrega - data_fechamento between 0 and 365
              then data_entrega - data_fechamento end as dias_entrega
  from v
),
faixas as (
  select faixa, count(*) as pedidos, sum(receita) as receita,
         avg(dias_entrega) as entrega_media,
         percentile_cont(0.5) within group (order by dias_entrega) as entrega_mediana,
         count(dias_entrega) as entrega_pedidos
  from faixas_base group by faixa
),
vendedores as (
  select vendedor, count(*) as pedidos, sum(receita) as receita, avg(receita) as ticket_medio
  from v where mes_ref >= (select make_date(extract(year from fim)::int - 2, 1, 1) from limites)
  group by vendedor
),
ytd as (
  select extract(year from fim)::int as ano, extract(month from fim)::int as mes from limites
),
ytd_vals as (
  select
    sum(receita) filter (where extract(year from mes_ref) = ytd.ano) as receita_atual,
    sum(receita) filter (where extract(year from mes_ref) = ytd.ano - 1 and extract(month from mes_ref) <= ytd.mes) as receita_anterior,
    count(*) filter (where extract(year from mes_ref) = ytd.ano) as pedidos_atual,
    count(*) filter (where extract(year from mes_ref) = ytd.ano - 1 and extract(month from mes_ref) <= ytd.mes) as pedidos_anterior
  from v, ytd group by ytd.ano, ytd.mes
),
top10 as (
  select sum(receita) as receita from (
    select receita from dc order by receita desc
    limit (select count(*) / 10 from dc)
  ) t
),
entrega as (
  select avg(dias_entrega) as media, percentile_cont(0.5) within group (order by dias_entrega) as mediana
  from faixas_base
)
select jsonb_build_object(
  'mensal', (select coalesce(jsonb_agg(jsonb_build_object(
      'mes', to_char(mes_ref, 'YYYY-MM'), 'pedidos', pedidos, 'receita', round(receita, 2),
      'ticket', round(ticket, 2), 'novos', novos,
      'receitaMesAnterior', round(receita_mes_anterior, 2),
      'receitaAnoAnterior', round(receita_ano_anterior, 2),
      'pedidosAnoAnterior', pedidos_ano_anterior) order by mes_ref), '[]'::jsonb) from mensal),
  'anual', (select coalesce(jsonb_agg(jsonb_build_object(
      'ano', ano, 'pedidos', pedidos, 'receita', round(receita, 2), 'ticketMedio', round(ticket_medio, 2),
      'ticketMediano', round(ticket_mediano::numeric, 2), 'meses', meses, 'novos', novos,
      'clientesAtivos', clientes_ativos, 'receitaAnoAnterior', round(receita_ano_anterior, 2)) order by ano), '[]'::jsonb)
    from anual_full),
  'canais', (select coalesce(jsonb_agg(jsonb_build_object(
      'canal', canal, 'pedidos', pedidos, 'receita', round(receita, 2), 'ticketMedio', round(ticket_medio, 2),
      'ticketMediano', round(ticket_mediano::numeric, 2)) order by receita desc), '[]'::jsonb) from canais),
  'faixas', (select coalesce(jsonb_agg(jsonb_build_object(
      'faixa', faixa, 'pedidos', pedidos, 'receita', round(receita, 2),
      'entregaMedia', round(entrega_media, 1), 'entregaMediana', entrega_mediana,
      'entregaPedidos', entrega_pedidos) order by faixa), '[]'::jsonb) from faixas),
  'clientes', (select coalesce(jsonb_agg(jsonb_build_object(
      'conta', conta, 'canal', canal, 'pedidos', pedidos, 'receita', round(receita, 2),
      'primeiro', to_char(primeiro, 'YYYY-MM'), 'ultimo', to_char(ultimo, 'YYYY-MM'), 'meses', vida)
      order by receita desc), '[]'::jsonb)
    from (select * from contas order by receita desc limit 40) t),
  'vendedores', (select coalesce(jsonb_agg(jsonb_build_object(
      'vendedor', vendedor, 'pedidos', pedidos, 'receita', round(receita, 2),
      'ticketMedio', round(ticket_medio, 2)) order by receita desc), '[]'::jsonb)
    from (select * from vendedores order by receita desc limit 15) t),
  'resumo', (select jsonb_build_object(
      'inicio', to_char((select ini from limites), 'YYYY-MM'),
      'fim', to_char((select fim from limites), 'YYYY-MM'),
      'receitaTotal', (select round(sum(receita), 2) from v),
      'pedidosTotal', (select count(*) from v),
      'zerados', (select count(*) from public.historico_pedidos
                  where org_id = (select private.current_org_id()) and receita <= 0),
      'ytdAno', (select ano from ytd), 'ytdMes', (select mes from ytd),
      'receitaYtd', (select round(receita_atual, 2) from ytd_vals),
      'receitaYtdAnterior', (select round(receita_anterior, 2) from ytd_vals),
      'pedidosYtd', (select pedidos_atual from ytd_vals),
      'pedidosYtdAnterior', (select pedidos_anterior from ytd_vals),
      'novosYtd', (select count(*) from dc, ytd where extract(year from primeiro) = ytd.ano),
      'novosYtdAnterior', (select count(*) from dc, ytd
                           where extract(year from primeiro) = ytd.ano - 1 and extract(month from primeiro) <= ytd.mes),
      'contas', (select count(*) from dc),
      'ltvMedio', (select round(avg(receita), 2) from dc),
      'ltvMediano', (select round(percentile_cont(0.5) within group (order by receita)::numeric, 2) from dc),
      'pedidosPorConta', (select round(avg(pedidos), 2) from dc),
      'pctRecompra', (select round(avg((pedidos > 1)::int), 4) from dc),
      'pctReceitaRecorrentes', (select round(sum(receita) filter (where pedidos > 1) / nullif(sum(receita), 0), 4) from dc),
      'ltvRecorrente', (select round(avg(receita), 2) from dc where pedidos > 1),
      'pedidosRecorrente', (select round(avg(pedidos), 2) from dc where pedidos > 1),
      'vidaRecorrente', (select round(avg(vida), 1) from dc where pedidos > 1),
      'pctTop10', (select round(top10.receita / nullif((select sum(receita) from dc), 0), 4) from top10),
      'entregaMedia', (select round(media, 1) from entrega),
      'entregaMediana', (select mediana from entrega)
    ))
)
$$;

revoke all on function public.historico_vendas_resumo() from public, anon;
grant execute on function public.historico_vendas_resumo() to authenticated;
