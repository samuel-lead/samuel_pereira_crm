-- Inove Gôndolas (Samuel, 06/11/26): ajuste do ranking "enviados pro Elton".
-- Até 04/11 a Inove passava o lead pro Elton marcando reunião (sem registro de
-- envio). Samuel confirmou: o Luciano enviou 33 leads em OUTUBRO e só 4 em
-- NOVEMBRO (Elcione, Miss, Laurindo e Thiago Luz). Cada envio vira um registro
-- no histórico (nível 3 = "Leads para o Elton"), com a data certa: a da
-- reunião marcada em outubro, ou 31/10 quando não há data de outubro.
-- O ranking passa a ler só o histórico (ver contarEnviadosAoCloserPorUsuario).
-- (Os leads da Ariany serão ajustados quando ela mandar a lista.)

with x(id, quando) as (values
  ('eee26204-4396-43d8-8c9b-86e5eccc9c0b'::uuid, '2026-11-04 08:29:00-03'::timestamptz),
  ('2e843df1-0130-4fcb-8e4c-94cba9124b75'::uuid, '2026-11-04 14:32:00-03'::timestamptz),
  ('00dae18e-8649-450f-ac06-0c2f927df903'::uuid, '2026-11-03 09:26:00-03'::timestamptz))
insert into nivel_historico (org_id, lead_id, de_ordem, para_ordem, motivo, automatico, ocorreu_em, usuario_id)
select '1820eb20-9fae-46fd-a986-2dfbe1b5702a', x.id, 15, 3, 'Enviado ao Elton (registro ajustado a pedido do Samuel em 06/11/26)', true, x.quando, '28bf388a-a599-4c94-98ff-87c676a17358'
from x where not exists (select 1 from nivel_historico h where h.lead_id = x.id and h.para_ordem = 3 and h.de_ordem <> 3);

insert into nivel_historico (org_id, lead_id, de_ordem, para_ordem, motivo, automatico, ocorreu_em, usuario_id)
select '1820eb20-9fae-46fd-a986-2dfbe1b5702a', l.id, 15, 3, 'Enviado ao Elton em outubro (registro ajustado a pedido do Samuel em 06/11/26)', true,
  coalesce((select min(r.marcada_em) from reunioes r where r.lead_id = l.id and r.marcada_em < '2026-11-01T00:00:00-03'), '2026-10-31 12:00:00-03'::timestamptz),
  '28bf388a-a599-4c94-98ff-87c676a17358'
from leads l
where l.org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and l.usuario_id = '28bf388a-a599-4c94-98ff-87c676a17358'
  and l.arquivado_em is null and l.nivel_ordem in (3, 4, 7)
  and l.id not in ('eee26204-4396-43d8-8c9b-86e5eccc9c0b','2e843df1-0130-4fcb-8e4c-94cba9124b75','00dae18e-8649-450f-ac06-0c2f927df903','26169fd7-66ba-4659-8d4e-e02e5b2a56f7')
  and not exists (select 1 from nivel_historico h where h.lead_id = l.id and h.para_ordem = 3 and h.de_ordem <> 3);
