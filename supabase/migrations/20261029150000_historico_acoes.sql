-- Samuel (29/10/26): "O que fazer agora" no Histórico de vendas — as listas
-- de clientes pra cada ação sugerida (reativar, garantir 2ª compra, quem
-- passou do tempo de comprar, canais parados). Mesma base e mesmas regras de
-- historico_ltv_detalhe: tempo em meses, "hoje" = último mês da planilha.

create or replace function public.historico_acoes()
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
meses_conta as (select distinct conta, mes_ref from v),
mc as (select conta, count(*) as meses_compra from meses_conta group by conta),
contas as (
  select c.conta, min(c.canal_conta) as canal, count(*) as pedidos, sum(c.receita) as receita,
         min(c.mes_ref) as primeiro, max(c.mes_ref) as ultimo, min(mc.meses_compra) as meses_compra
  from v c join mc on mc.conta = c.conta
  group by c.conta
),
c2 as (
  select ct.*,
         ((extract(year from ultimo) - extract(year from primeiro)) * 12
           + extract(month from ultimo) - extract(month from primeiro))::int as span,
         ((extract(year from f.fim) - extract(year from ultimo)) * 12
           + extract(month from f.fim) - extract(month from ultimo))::int as parado
  from contas ct, fim f
),
c3 as (
  select *, case when meses_compra > 1 then round(span::numeric / (meses_compra - 1), 1) end as intervalo
  from c2
),
dc as (select * from c3 where canal = 'Demais clientes'),
-- 1) compraram 2+ vezes e estão sem pedido há 12 meses ou mais
reativar as (select * from dc where pedidos > 1 and parado >= 12),
-- 2) compraram uma vez só, nos últimos 6 meses: janela da 2ª compra
segunda as (select * from dc where pedidos = 1 and parado between 1 and 6),
-- 3) clientes ativos que já passaram (1,5x) do intervalo normal deles
atrasados as (
  select * from dc
  where meses_compra > 1 and parado between 2 and 11 and parado > 1.5 * intervalo
),
-- 4) redes/revendas (Big Lar, Hiper, Forte): último pedido de cada canal
canais as (
  select v.canal as conta, count(*) as pedidos, sum(v.receita) as receita, max(v.mes_ref) as ultimo,
         sum(v.receita) filter (where v.mes_ref > (f.fim - interval '12 months')) as receita_12m,
         sum(v.receita) filter (where v.mes_ref <= (f.fim - interval '12 months')
                                  and v.mes_ref > (f.fim - interval '24 months')) as receita_12m_ant,
         ((extract(year from f.fim) - extract(year from max(v.mes_ref))) * 12
           + extract(month from f.fim) - extract(month from max(v.mes_ref)))::int as parado
  from v, fim f where v.canal <> 'Demais clientes'
  group by v.canal, f.fim
),
total as (select sum(receita) as receita from v)
select jsonb_build_object(
  'fim', (select to_char(fim, 'YYYY-MM') from fim),
  'reativar', jsonb_build_object(
    'total', (select count(*) from reativar),
    'receita', (select round(sum(receita), 2) from reativar),
    'lista', (select coalesce(jsonb_agg(jsonb_build_object(
        'conta', conta, 'receita', round(receita, 2), 'pedidos', pedidos,
        'ultimo', to_char(ultimo, 'YYYY-MM'), 'parado', parado, 'intervalo', intervalo) order by receita desc), '[]'::jsonb)
      from (select * from reativar order by receita desc limit 30) t)),
  'segunda', jsonb_build_object(
    'total', (select count(*) from segunda),
    'receita', (select round(sum(receita), 2) from segunda),
    'lista', (select coalesce(jsonb_agg(jsonb_build_object(
        'conta', conta, 'receita', round(receita, 2), 'pedidos', pedidos,
        'ultimo', to_char(ultimo, 'YYYY-MM'), 'parado', parado) order by receita desc), '[]'::jsonb)
      from (select * from segunda order by receita desc limit 30) t)),
  'atrasados', jsonb_build_object(
    'total', (select count(*) from atrasados),
    'receita', (select round(sum(receita), 2) from atrasados),
    'lista', (select coalesce(jsonb_agg(jsonb_build_object(
        'conta', conta, 'receita', round(receita, 2), 'pedidos', pedidos,
        'ultimo', to_char(ultimo, 'YYYY-MM'), 'parado', parado, 'intervalo', intervalo) order by receita desc), '[]'::jsonb)
      from (select * from atrasados order by receita desc limit 30) t)),
  'canais', (select coalesce(jsonb_agg(jsonb_build_object(
        'conta', conta, 'receita', round(receita, 2), 'pedidos', pedidos,
        'ultimo', to_char(ultimo, 'YYYY-MM'), 'parado', parado, 'receita12m', round(coalesce(receita_12m, 0), 2),
        'receita12mAnterior', round(coalesce(receita_12m_ant, 0), 2))
        order by receita desc), '[]'::jsonb)
      from canais),
  'concentracao', jsonb_build_object(
    'maiorConta', (select conta from c3 order by receita desc limit 1),
    'pctMaiorConta', (select round(max(receita) / nullif((select receita from total), 0), 4) from c3),
    'pctTop10Diretos', (select round(sum(receita) / nullif((select sum(receita) from dc), 0), 4)
                        from (select receita from dc order by receita desc limit (select count(*) / 10 from dc)) t)
  )
)
$$;

revoke all on function public.historico_acoes() from public, anon;
grant execute on function public.historico_acoes() to authenticated;
