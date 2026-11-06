-- Inove Gôndolas (Samuel, 06/11/26): "Dia 1" a "Dia 5" passam a se chamar
-- "Abordagem dia 1" a "Abordagem dia 5".
update niveis
set nome = 'Abordagem dia ' || case ordem when 1 then 1 when 11 then 2 when 12 then 3 when 13 then 4 when 14 then 5 end,
    etiqueta_wpp = 'Abordagem dia ' || case ordem when 1 then 1 when 11 then 2 when 12 then 3 when 13 then 4 when 14 then 5 end
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and ordem in (1, 11, 12, 13, 14);
