-- Inove Gôndolas (Samuel, 04/11/26):
-- 1) Os leads que já estavam em "Novo para o Elton" (3), "Em negociação" (4)
--    e "Proposta enviada" (7) passam a ser do Elton (closer).
-- 2) As reuniões que estavam "marcadas" saem do ar: viram "cancelada". Nada
--    é apagado (a linha continua na tabela) e a empresa não usa mais reunião.
-- O aviso "Lead novo, atribuído a você" é desligado só durante a troca, senão
-- o Elton receberia mensagem no WhatsApp por lead.

alter table public.leads disable trigger trigger_notificar_lead_atribuido;

update public.leads
set responsavel_id = (
  select id from public.usuarios
  where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and funcao = 'closer'
  order by created_at limit 1
)
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a'
  and arquivado_em is null
  and nivel_ordem in (3, 4, 7);

alter table public.leads enable trigger trigger_notificar_lead_atribuido;

update public.reunioes
set status = 'cancelada'
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a'
  and status = 'marcada';
