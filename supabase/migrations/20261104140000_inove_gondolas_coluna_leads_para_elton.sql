-- Inove Gôndolas (Samuel, 04/11/26): a primeira coluna de Vendas passa a se
-- chamar "Leads para o Elton" e deixa de ter número (não é "N3").
update public.niveis
set nome = 'Leads para o Elton',
    definicao = 'Lead qualificado pelo SDR e enviado para o Elton; ele ainda não começou a negociar',
    etiqueta_wpp = 'Leads para o Elton',
    numerado = false
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and ordem = 3;
