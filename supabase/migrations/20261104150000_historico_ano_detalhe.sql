-- Samuel (04/11/26): "2026 em detalhe" dentro do Histórico de vendas da Inove
-- Gôndolas — vendas, período, vendedor, ticket médio, LTV, tudo do ano
-- escolhido, calculado aqui em SQL (regra do projeto: métrica não é calculada
-- pela tela). Roda com a permissão de quem chama, então a RLS de
-- historico_pedidos vale: quem não é admin da empresa recebe tudo vazio.
-- Só lê dados; nada é gravado.
create or replace function public.historico_ano_detalhe(p_ano int)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with
v as (
  select id, mes_ref, conta, cliente, canal, canal_conta, vendedor, receita,
         data_fechamento, data_entrega, coalesce(data_fechamento, mes_ref) as dia
  from public.historico_pedidos
  where org_id = (select private.current_org_id()) and receita > 0
),
a as (select * from v where extract(year from mes_ref) = p_ano),
ant as (select * from v where extract(year from mes_ref) = p_ano - 1),
-- cada conta na vida inteira (base do LTV); "diretos" = fora rede/revenda
vida as (
  select conta, min(canal_conta) as canal, count(*) as pedidos, sum(receita) as receita,
         min(mes_ref) as primeiro, max(mes_ref) as ultimo
  from v group by conta
),
vend_conta as (
  select conta, vendedor, sum(receita) as r from a group by conta, vendedor
),
vend_principal as (
  select distinct on (conta) conta, vendedor from vend_conta order by conta, r desc
),
contas_ano as (
  select a.conta, min(a.canal_conta) as canal, count(*) as pedidos, sum(a.receita) as receita,
         min(a.dia) as primeiro_dia, max(a.dia) as ultimo_dia
  from a group by a.conta
),
contas_ano_full as (
  select c.*, vp.vendedor as vendedor_principal, vi.receita as ltv_vida, vi.pedidos as pedidos_vida,
         vi.primeiro as primeiro_mes_vida,
         (extract(year from vi.primeiro) = p_ano) as novo
  from contas_ano c
  join vida vi using (conta)
  join vend_principal vp using (conta)
),
diretos_ano as (select * from contas_ano_full where canal = 'Demais clientes'),
vend as (
  select vendedor, count(*) as pedidos, sum(receita) as receita, avg(receita) as ticket_medio,
         percentile_cont(0.5) within group (order by receita) as ticket_mediano,
         count(distinct conta) as clientes, min(dia) as primeiro_dia, max(dia) as ultimo_dia
  from a group by vendedor
),
vend_mes as (
  select vendedor, extract(month from mes_ref)::int as mes, sum(receita) as receita from a group by 1, 2
),
vend_melhor as (
  select distinct on (vendedor) vendedor, mes, receita from vend_mes order by vendedor, receita desc
),
vend_extra as (
  select x.vendedor,
         count(*) filter (where cf.novo and cf.canal = 'Demais clientes') as novos,
         avg(cf.ltv_vida) filter (where cf.canal = 'Demais clientes') as ltv_medio
  from (select distinct vendedor, conta from a) x
  join contas_ano_full cf using (conta)
  group by x.vendedor
),
mes as (
  select m.mes, coalesce(sum(a.receita), 0) as receita, count(a.id) as pedidos,
         count(distinct a.conta) as clientes
  from generate_series(1, 12) m(mes)
  left join a on extract(month from a.mes_ref) = m.mes
  group by m.mes
),
mes_lider as (
  select distinct on (mes) mes, vendedor, receita from vend_mes order by mes, receita desc
),
mes_novos as (
  select extract(month from primeiro)::int as mes, count(*) as novos
  from vida where extract(year from primeiro) = p_ano and canal = 'Demais clientes' group by 1
),
canais as (
  select canal, count(*) as pedidos, sum(receita) as receita, avg(receita) as ticket_medio from a group by canal
),
maiores as (
  select dia, conta, cliente, vendedor, canal, receita,
         case when data_fechamento is not null and data_entrega is not null
                   and data_entrega - data_fechamento between 0 and 365
              then data_entrega - data_fechamento end as dias_entrega
  from a order by receita desc limit 10
),
melhor_mes as (select mes, receita from mes order by receita desc limit 1)
select jsonb_build_object(
  'ano', p_ano,
  'resumo', (select jsonb_build_object(
      'receita', round(coalesce(sum(receita), 0), 2),
      'pedidos', count(*),
      'ticketMedio', round(avg(receita), 2),
      'ticketMediano', round((percentile_cont(0.5) within group (order by receita))::numeric, 2),
      'mesesComPedido', count(distinct mes_ref),
      'primeiroDia', min(dia), 'ultimoDia', max(dia),
      'clientes', count(distinct conta),
      'receitaAnoAnterior', (select round(sum(receita), 2) from ant),
      'pedidosAnoAnterior', (select count(*) from ant),
      'ticketAnoAnterior', (select round(avg(receita), 2) from ant),
      'clientesAnoAnterior', (select count(distinct conta) from ant),
      'clientesDiretos', (select count(*) from diretos_ano),
      'clientesNovos', (select count(*) from diretos_ano where novo),
      'clientesRecorrentes', (select count(*) from diretos_ano where not novo),
      'receitaNovos', (select round(coalesce(sum(receita), 0), 2) from diretos_ano where novo),
      'receitaRecorrentes', (select round(coalesce(sum(receita), 0), 2) from diretos_ano where not novo),
      'ltvMedioAtivos', (select round(avg(ltv_vida), 2) from diretos_ano),
      'ltvMedianoAtivos', (select round((percentile_cont(0.5) within group (order by ltv_vida))::numeric, 2) from diretos_ano),
      'compraMediaNoAno', (select round(avg(receita), 2) from diretos_ano),
      'pedidosPorCliente', (select round(avg(pedidos), 2) from diretos_ano),
      'pctRecompraNoAno', (select round(avg((pedidos > 1)::int), 4) from diretos_ano),
      'melhorMes', (select jsonb_build_object('mes', mes, 'receita', round(receita, 2)) from melhor_mes),
      'maiorPedido', (select jsonb_build_object('valor', round(receita, 2), 'conta', conta, 'vendedor', vendedor, 'dia', dia)
                      from (select * from maiores order by receita desc limit 1) mp)
    ) from a),
  'meses', (select coalesce(jsonb_agg(jsonb_build_object(
      'mes', m.mes, 'receita', round(m.receita, 2), 'pedidos', m.pedidos, 'clientes', m.clientes,
      'ticket', case when m.pedidos > 0 then round(m.receita / m.pedidos, 2) end,
      'novos', coalesce(n.novos, 0),
      'lider', l.vendedor, 'liderReceita', round(l.receita, 2)) order by m.mes), '[]'::jsonb)
    from mes m left join mes_novos n using (mes) left join mes_lider l using (mes)),
  'vendedores', (select coalesce(jsonb_agg(jsonb_build_object(
      'vendedor', vd.vendedor, 'pedidos', vd.pedidos, 'receita', round(vd.receita, 2),
      'ticketMedio', round(vd.ticket_medio, 2),
      'ticketMediano', round(vd.ticket_mediano::numeric, 2),
      'clientes', vd.clientes, 'novos', coalesce(ve.novos, 0),
      'ltvMedio', round(ve.ltv_medio, 2),
      'primeiroDia', vd.primeiro_dia, 'ultimoDia', vd.ultimo_dia,
      'melhorMes', vm.mes, 'melhorMesReceita', round(vm.receita, 2),
      'porMes', (select jsonb_agg(coalesce(round(x.receita, 2), 0) order by g.mes)
                 from generate_series(1, 12) g(mes)
                 left join vend_mes x on x.vendedor = vd.vendedor and x.mes = g.mes)
    ) order by vd.receita desc), '[]'::jsonb)
    from vend vd
    left join vend_extra ve using (vendedor)
    left join vend_melhor vm using (vendedor)),
  'clientes', (select coalesce(jsonb_agg(jsonb_build_object(
      'conta', conta, 'canal', canal, 'vendedor', vendedor_principal, 'pedidos', pedidos,
      'receita', round(receita, 2), 'ticketMedio', round(receita / pedidos, 2),
      'primeiroDia', primeiro_dia, 'ultimoDia', ultimo_dia,
      'ltvVida', round(ltv_vida, 2), 'pedidosVida', pedidos_vida,
      'primeiroMesVida', to_char(primeiro_mes_vida, 'YYYY-MM'), 'novo', novo
    ) order by receita desc), '[]'::jsonb)
    from (select * from contas_ano_full order by receita desc limit 20) t),
  'canais', (select coalesce(jsonb_agg(jsonb_build_object(
      'canal', canal, 'pedidos', pedidos, 'receita', round(receita, 2), 'ticketMedio', round(ticket_medio, 2)
    ) order by receita desc), '[]'::jsonb) from canais),
  'maioresPedidos', (select coalesce(jsonb_agg(jsonb_build_object(
      'dia', dia, 'conta', conta, 'cliente', cliente, 'vendedor', vendedor, 'canal', canal,
      'valor', round(receita, 2), 'diasEntrega', dias_entrega
    ) order by receita desc), '[]'::jsonb) from maiores)
)
$$;

revoke all on function public.historico_ano_detalhe(int) from public, anon;
grant execute on function public.historico_ano_detalhe(int) to authenticated;
