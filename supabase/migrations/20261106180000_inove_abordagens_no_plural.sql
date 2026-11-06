-- Inove Gôndolas (Samuel, 06/11/26): "Abordagem dia N" vira "Abordagens dia N".
update niveis
set nome = replace(nome, 'Abordagem dia', 'Abordagens dia'),
    etiqueta_wpp = replace(etiqueta_wpp, 'Abordagem dia', 'Abordagens dia')
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and ordem in (1, 11, 12, 13, 14);
