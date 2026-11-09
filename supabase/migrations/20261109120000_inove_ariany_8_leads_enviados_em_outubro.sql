-- Inove Gôndolas (Samuel, 09/11/26): os 8 leads que a Ariany colocou hoje de
-- manhã (origem "tráfego pago", 09h40 a 10h03) são oportunidades que ela
-- enviou ao Elton em OUTUBRO. Passam de Novos Leads para "Leads para o Elton"
-- (nível 3, responsável Elton) e cada um ganha o registro de envio dela
-- (data 31/10) pro ranking e pra evolução comercial.
-- O aviso de WhatsApp de lead atribuído fica desligado só durante o lote.

alter table leads disable trigger trigger_notificar_lead_atribuido;

create temp table lista_ariany on commit drop as
select id from leads
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a'
  and usuario_id = '8c7c69c5-2bf8-4306-8813-e238320b3546'
  and nivel_ordem = 0 and arquivado_em is null
  and created_at >= '2026-11-09 12:00:00+00' and created_at < '2026-11-09 14:00:00+00';

insert into nivel_historico (org_id, lead_id, de_ordem, para_ordem, motivo, automatico, ocorreu_em, usuario_id)
select '1820eb20-9fae-46fd-a986-2dfbe1b5702a', id, 0, 3,
  'Enviado ao Elton em outubro (leads da Ariany, registro ajustado a pedido do Samuel em 09/11/26)', true,
  '2026-10-31 12:00:00-03'::timestamptz, '8c7c69c5-2bf8-4306-8813-e238320b3546'
from lista_ariany;

update leads
set nivel_ordem = 3, responsavel_id = 'f5ff01cc-e929-4236-b330-b805329797e2', entrou_nivel_em = now()
where id in (select id from lista_ariany);

alter table leads enable trigger trigger_notificar_lead_atribuido;
