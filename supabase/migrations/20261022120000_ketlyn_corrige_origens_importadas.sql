-- Samuel (22/10/26): a importação da Ketlyn (20/10, antes da correção do
-- importador) gravou DATA e HORA da planilha como ORIGEM de 74 leads e criou ~40
-- "origens" lixo ("19/10/2026", "16:56"...). Conserto: esses leads ficam com a
-- origem "Trafego" (a origem da importação principal dela), cada um ganha uma nota
-- com o valor original (nada se perde) e as origens lixo saem do cadastro.
-- (Aplicado direto no banco em 22/10; este arquivo registra o que foi feito.)
with org as (select id from public.orgs where nome = 'Ketlyn Ribeiro'),
alvo as (
  select l.id, l.org_id, l.origem as origem_antiga from public.leads l, org
  where l.org_id = org.id and l.arquivado_em is null
    and (l.origem ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' or l.origem ~ '^[0-9]{1,2}:[0-9]{2}$')
),
notas as (
  insert into public.interacoes (org_id, usuario_id, lead_id, tipo, canal, conteudo, ocorreu_em, origem)
  select org_id, 'd87a2683-576c-4558-a6ec-c1aa7917e25c', id, 'nota', 'manual',
         'Planilha de importação trazia "' || origem_antiga || '" na coluna que virou origem por engano. Origem corrigida para Trafego.',
         now(), 'declarado'
  from alvo returning 1
),
corrigidos as (
  update public.leads l set origem = 'Trafego' from alvo where l.id = alvo.id returning l.id
)
delete from public.origens
where org_id = (select id from org)
  and (nome ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' or nome ~ '^[0-9]{1,2}:[0-9]{2}$');
