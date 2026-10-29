-- Samuel (29/10/26): LTV mais detalhado no Histórico de vendas — quantas
-- vezes o cliente compra, quanto tempo leva pra voltar a comprar e por
-- quanto tempo ele continua comprando.
--
-- Tempo é medido em MESES (mês do pedido), porque a planilha não tem data de
-- fechamento em 2024 e 2025. "Mês de compra" = mês em que o cliente teve pelo
-- menos um pedido. Só clientes diretos (canal da conta = 'Demais clientes'),
-- igual ao resto da seção de LTV; a tabela de maiores clientes inclui todos.

create or replace function public.historico_ltv_detalhe()
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
fim as (select max(mes_ref) as fim from v),
-- meses distintos de compra por conta, numerados
meses_conta as (
  select conta, mes_ref, row_number() over (partition by conta order by mes_ref) as n
  from (select distinct conta, mes_ref from v) t
),
mc as (
  select conta, count(*) as meses_compra, min(mes_ref) filter (where n = 2) as segundo
  from meses_conta group by conta
),
contas as (
  select c.conta, min(c.canal_conta) as canal, count(*) as pedidos, sum(c.receita) as receita,
         min(c.mes_ref) as primeiro, max(c.mes_ref) as ultimo,
         min(mc.meses_compra) as meses_compra, min(mc.segundo) as segundo
  from v c join mc on mc.conta = c.conta
  group by c.conta
),
contas2 as (
  select ct.*,
         ((extract(year from ultimo) - extract(year from primeiro)) * 12
           + extract(month from ultimo) - extract(month from primeiro))::int as span,
         case when segundo is not null then
           ((extract(year from segundo) - extract(year from primeiro)) * 12
             + extract(month from segundo) - extract(month from primeiro))::int end as ate_segunda,
         ((extract(year from f.fim) - extract(year from ultimo)) * 12
           + extract(month from f.fim) - extract(month from ultimo))::int as meses_sem_comprar,
         ((extract(year from f.fim) - extract(year from primeiro)) * 12
           + extract(month from f.fim) - extract(month from primeiro))::int as meses_desde_inicio
  from contas ct, fim f
),
dc as (
  select *,
         span + 1 as vida,
         case when meses_compra > 1 then span::numeric / (meses_compra - 1) end as intervalo
  from contas2 where canal = 'Demais clientes'
),
rec as (select * from dc where pedidos > 1),
freq as (
  select case when pedidos = 1 then 1 when pedidos = 2 then 2 when pedidos <= 5 then 3
              when pedidos <= 10 then 4 else 5 end as faixa, *
  from dc
),
vida_faixas as (
  select case when vida <= 6 then 1 when vida <= 12 then 2 when vida <= 24 then 3
              when vida <= 48 then 4 else 5 end as faixa, *
  from rec
),
intervalo_faixas as (
  select case when intervalo <= 1 then 1 when intervalo <= 3 then 2 when intervalo <= 6 then 3
              when intervalo <= 12 then 4 else 5 end as faixa, *
  from dc where intervalo is not null
),
coorte as (
  select extract(year from primeiro)::int as ano, *
  from dc
)
select jsonb_build_object(
  'resumo', jsonb_build_object(
    'contas', (select count(*) from dc),
    'recorrentes', (select count(*) from rec),
    'ltvMedio', (select round(avg(receita), 2) from dc),
    'ltvMediano', (select round(percentile_cont(0.5) within group (order by receita)::numeric, 2) from dc),
    'ltvUmaVez', (select round(avg(receita), 2) from dc where pedidos = 1),
    'ltvRecorrente', (select round(avg(receita), 2) from rec),
    'ltvRecorrenteMediano', (select round(percentile_cont(0.5) within group (order by receita)::numeric, 2) from rec),
    'pedidosMedio', (select round(avg(pedidos), 2) from dc),
    'pedidosRecorrente', (select round(avg(pedidos), 2) from rec),
    'pedidosRecorrenteMediano', (select percentile_cont(0.5) within group (order by pedidos) from rec),
    'ticketUmaVez', (select round(sum(receita) / nullif(sum(pedidos), 0), 2) from dc where pedidos = 1),
    'ticketRecorrente', (select round(sum(receita) / nullif(sum(pedidos), 0), 2) from rec),
    'vidaRecorrente', (select round(avg(vida), 1) from rec),
    'vidaRecorrenteMediana', (select percentile_cont(0.5) within group (order by vida) from rec),
    'intervaloMedio', (select round(avg(intervalo), 1) from dc where intervalo is not null),
    'intervaloMediano', (select round(percentile_cont(0.5) within group (order by intervalo)::numeric, 1) from dc where intervalo is not null),
    'ateSegundaMedia', (select round(avg(ate_segunda), 1) from dc where ate_segunda is not null),
    'ateSegundaMediana', (select percentile_cont(0.5) within group (order by ate_segunda) from dc where ate_segunda is not null),
    -- volta em até N meses: só conta quem já teve N meses de histórico desde a 1ª compra
    'voltou3', (select round(avg((ate_segunda is not null and ate_segunda <= 3)::int), 4) from dc where meses_desde_inicio >= 3),
    'voltou6', (select round(avg((ate_segunda is not null and ate_segunda <= 6)::int), 4) from dc where meses_desde_inicio >= 6),
    'voltou12', (select round(avg((ate_segunda is not null and ate_segunda <= 12)::int), 4) from dc where meses_desde_inicio >= 12),
    'recorrentesAtivos', (select count(*) from rec where meses_sem_comprar < 12),
    'recorrentesParados', (select count(*) from rec where meses_sem_comprar >= 12)
  ),
  'frequencia', (select coalesce(jsonb_agg(jsonb_build_object(
      'faixa', faixa, 'contas', contas, 'receita', round(receita, 2), 'ltv', round(ltv, 2),
      'pedidos', round(pedidos, 1), 'vida', round(vida, 1), 'intervalo', round(intervalo, 1)) order by faixa), '[]'::jsonb)
    from (select faixa, count(*) as contas, sum(receita) as receita, avg(receita) as ltv, avg(pedidos) as pedidos,
                 avg(vida) as vida, avg(intervalo) as intervalo
          from freq group by faixa) t),
  'vida', (select coalesce(jsonb_agg(jsonb_build_object(
      'faixa', faixa, 'contas', contas, 'ltv', round(ltv, 2)) order by faixa), '[]'::jsonb)
    from (select faixa, count(*) as contas, avg(receita) as ltv from vida_faixas group by faixa) t),
  'intervalos', (select coalesce(jsonb_agg(jsonb_build_object(
      'faixa', faixa, 'contas', contas, 'ltv', round(ltv, 2)) order by faixa), '[]'::jsonb)
    from (select faixa, count(*) as contas, avg(receita) as ltv from intervalo_faixas group by faixa) t),
  'coortes', (select coalesce(jsonb_agg(jsonb_build_object(
      'ano', ano, 'contas', contas, 'ltv', round(ltv, 2), 'recompra', round(recompra, 4),
      'pedidos', round(pedidos, 2), 'ativos', ativos) order by ano), '[]'::jsonb)
    from (select ano, count(*) as contas, avg(receita) as ltv, avg((pedidos > 1)::int) as recompra,
                 avg(pedidos) as pedidos, count(*) filter (where meses_sem_comprar < 12) as ativos
          from coorte group by ano) t),
  'clientes', (select coalesce(jsonb_agg(jsonb_build_object(
      'conta', conta, 'canal', canal, 'pedidos', pedidos, 'mesesCompra', meses_compra,
      'receita', round(receita, 2), 'primeiro', to_char(primeiro, 'YYYY-MM'), 'ultimo', to_char(ultimo, 'YYYY-MM'),
      'vida', span + 1,
      'intervalo', case when meses_compra > 1 then round(span::numeric / (meses_compra - 1), 1) end,
      'mesesSemComprar', meses_sem_comprar) order by receita desc), '[]'::jsonb)
    from (select * from contas2 order by receita desc limit 40) t)
)
$$;

revoke all on function public.historico_ltv_detalhe() from public, anon;
grant execute on function public.historico_ltv_detalhe() to authenticated;
