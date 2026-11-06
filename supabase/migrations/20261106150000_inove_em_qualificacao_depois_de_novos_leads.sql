-- Inove Gôndolas (Samuel, 06/11/26): "Em qualificação" passa a ficar logo
-- depois de "Novos Leads", antes do Dia 1. Como o Dia 1 é o nível 1 (que vem
-- antes do 2 em toda empresa), "Em qualificação" da Inove ganha o número 15
-- (que o código trata como posição 0,5 — ver posicaoNoFunil). Só a Inove.
--
-- Mexe nos 3 lugares que guardam esse número, tudo da Inove: os leads, o
-- histórico de movimentações e a própria linha do nível. Nenhum lead é
-- apagado. A alteração do nível não dispara aviso no WhatsApp (os gatilhos só
-- avisam lead novo em Novos Leads ou troca de responsável).

-- A regra do banco precisa aceitar o 15 ANTES de qualquer troca.
alter table niveis drop constraint if exists niveis_ordem_check;
alter table niveis add constraint niveis_ordem_check check (ordem >= 0 and ordem <= 15);

update leads
set nivel_ordem = 15
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and nivel_ordem = 2;

update nivel_historico
set de_ordem = case when de_ordem = 2 then 15 else de_ordem end,
    para_ordem = case when para_ordem = 2 then 15 else para_ordem end
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and (de_ordem = 2 or para_ordem = 2);

update niveis
set ordem = 15
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and ordem = 2;
