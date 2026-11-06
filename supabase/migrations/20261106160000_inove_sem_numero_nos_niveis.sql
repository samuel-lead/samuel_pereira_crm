-- Inove Gôndolas (Samuel, 06/11/26): "Em qualificação" aparecia como
-- "N1 - Em qualificação". Sem número nenhum agora. A Base também deixa de ser
-- numerada (senão ela passaria a aparecer como "N1 - Base").
update niveis
set numerado = false
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and ordem in (15, 9);
