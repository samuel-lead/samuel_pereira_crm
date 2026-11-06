-- Inove Gôndolas (Samuel, 06/11/26): os envios da Ariany em NOVEMBRO são só 4:
-- Space Games Lan House, Lucas Santos, Pedro Matheus e Pedro Henrique.
-- Os 3 últimos (criados hoje em Novos Leads) vão pra "Leads para o Elton"
-- (responsável Elton) com o registro de envio. Drogaria Inter Farma e ODENE
-- passam a contar em outubro (a data original fica anotada no motivo).
-- O aviso de WhatsApp de lead atribuído fica desligado só durante o lote.

alter table leads disable trigger trigger_notificar_lead_atribuido;

insert into nivel_historico (org_id, lead_id, de_ordem, para_ordem, motivo, automatico, ocorreu_em, usuario_id)
select '1820eb20-9fae-46fd-a986-2dfbe1b5702a', l.id, 0, 3,
  'Enviado ao Elton em novembro (lista da Ariany, registro ajustado a pedido do Samuel em 06/11/26)', true, now(), '8c7c69c5-2bf8-4306-8813-e238320b3546'
from leads l
where l.id in ('fda94f0f-1105-4ab6-867f-6c6ff8e8b7ac','22640eb1-ce9e-45ee-8c97-f605b05ba7da','536c3b97-010c-4db6-ad21-b7a549b98ee3') and l.nivel_ordem = 0;

update leads
set nivel_ordem = 3, responsavel_id = 'f5ff01cc-e929-4236-b330-b805329797e2', entrou_nivel_em = now()
where id in ('fda94f0f-1105-4ab6-867f-6c6ff8e8b7ac','22640eb1-ce9e-45ee-8c97-f605b05ba7da','536c3b97-010c-4db6-ad21-b7a549b98ee3') and nivel_ordem = 0;

alter table leads enable trigger trigger_notificar_lead_atribuido;

update nivel_historico h
set ocorreu_em = '2026-10-31 12:00:00-03'::timestamptz,
    motivo = coalesce(h.motivo, '') || ' [contado em outubro a pedido do Samuel em 06/11/26; data original ' || to_char(h.ocorreu_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || ']'
where h.org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and h.para_ordem = 3 and h.de_ordem <> 3
  and h.lead_id in (select id from leads where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and nome in ('Drogaria Inter Farma', 'ODENE') and usuario_id = '8c7c69c5-2bf8-4306-8813-e238320b3546');
