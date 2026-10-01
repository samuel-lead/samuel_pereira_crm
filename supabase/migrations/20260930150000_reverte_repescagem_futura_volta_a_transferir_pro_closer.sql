-- Samuel corrigiu o pedido anterior (migration
-- 20260930140000_repescagem_futura_nao_transfere_pro_closer.sql): a
-- transferência da Repescagem futura de ICP pro Closer NÃO é um
-- problema — pode continuar transferindo, igual Follow após reunião e
-- Oportunidades de verdade. O problema real era outro: o SDR precisava
-- continuar conseguindo agir sobre o lead depois da transferência. Isso
-- foi resolvido no código (painel/lib/leads/actions.ts,
-- reivindicarLead/podeReivindicar) deixando o SDR que marcou a reunião
-- original "pegar de volta" o lead quando ele estiver em Follow após
-- reunião ou Oportunidades (inclui Repescagem futura) — sem precisar
-- impedir a transferência em si.
--
-- Esta migration devolve pro Closer os 32 leads que a migration anterior
-- tinha devolvido pro SDR, voltando ao estado original.
with reverter as (
  select l.id, l.org_id, l.responsavel_id as sdr_atual, r.closer_id
  from leads l
  join lateral (
    select closer_id
    from reunioes
    where lead_id = l.id and status = 'realizada'
    order by agendada_para desc
    limit 1
  ) r on true
  join nivel_historico h on h.lead_id = l.id and h.motivo = 'Devolvido pro SDR original — Repescagem futura de ICP não é mais 100% do Closer'
  where l.oportunidade_futura = true
    and l.arquivado_em is null
    and l.status = 'ativo'
    and r.closer_id is not null
    and r.closer_id <> l.responsavel_id
), hist as (
  insert into nivel_historico (org_id, lead_id, de_ordem, para_ordem, motivo, automatico)
  select org_id, id, 8, 8, 'Devolvido pro Closer — confirmado que Repescagem futura também é 100% dele', true
  from reverter
  returning lead_id
)
update leads l set responsavel_id = reverter.closer_id
from reverter
where l.id = reverter.id;
