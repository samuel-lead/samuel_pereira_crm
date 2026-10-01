-- Samuel foi explícito: só "Follow após reunião" (7) e "Oportunidades pro
-- fim do mês" de verdade (8, sem ser repescagem) são 100% do Closer.
-- "Repescagem futura de ICP" (nível 8 com oportunidade_futura = true)
-- continua sendo responsabilidade de quem já era dono do lead — o SDR
-- precisa continuar conseguindo movimentá-lo. A trava que impedia isso
-- (`sincronizarReuniao` transferindo pro Closer sempre que a reunião é
-- marcada como "realizada", mesmo indo pra Repescagem futura) foi
-- corrigida direto no código (painel/lib/leads/actions.ts).
--
-- Esta migration só corrige os dados que já tinham sido transferidos
-- errado por essa trava, devolvendo pro SDR que realmente marcou a
-- reunião (reunioes.usuario_id) — em todas as empresas clientes, não só
-- a do Samuel, porque é uma regra de negócio da plataforma, não uma
-- preferência de uma empresa só.
with corrigir as (
  select l.id, r.usuario_id as sdr_original, l.org_id, l.responsavel_id as closer_atual
  from leads l
  join lateral (
    select usuario_id, closer_id
    from reunioes
    where lead_id = l.id and status = 'realizada'
    order by agendada_para desc
    limit 1
  ) r on true
  where l.oportunidade_futura = true
    and l.arquivado_em is null
    and l.status = 'ativo'
    and r.closer_id = l.responsavel_id
    and r.usuario_id is not null
    and r.usuario_id <> l.responsavel_id
), hist as (
  insert into nivel_historico (org_id, lead_id, de_ordem, para_ordem, motivo, automatico)
  select org_id, id, 8, 8, 'Devolvido pro SDR original — Repescagem futura de ICP não é mais 100% do Closer', true
  from corrigir
  returning lead_id
)
update leads l set responsavel_id = corrigir.sdr_original
from corrigir
where l.id = corrigir.id;
