-- Banker - Consorcio: as colunas "qualifiquei e sumiu" e "não teve interesse"
-- da Base viram uma só (Samuel, 27/10/26). Os leads que estavam na primeira
-- passam pra segunda, com uma nota na linha do tempo de cada um.
with alvos as (
  select id, responsavel_id from public.leads
  where org_id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed' and nivel_ordem = 9 and arquivado_em is null
    and motivo_base in ('qualificou_sumiu', 'nao_reagendados')
), nota as (
  insert into public.interacoes (org_id, usuario_id, lead_id, tipo, canal, conteudo, ocorreu_em, origem)
  select 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed', responsavel_id, id, 'nota', 'manual',
         'Motivo da Base alterado de "Iniciei conversa, qualifiquei e sumiu" para "Iniciei conversa e não teve interesse" (colunas unificadas na Banker)',
         now(), 'declarado'
  from alvos where responsavel_id is not null
)
update public.leads l set motivo_base = 'iniciou_sem_interesse' from alvos a where l.id = a.id;
