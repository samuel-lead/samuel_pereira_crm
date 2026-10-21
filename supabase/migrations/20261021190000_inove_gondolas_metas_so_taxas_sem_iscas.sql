-- Samuel (21/10/26): na Inove Gôndolas
--  * sem "Captura de leads" (menu e página);
--  * metas: ficam só as taxas de comparecimento (80%) e de venda (40%);
--    saem o piso de leads por dia, o piso de reuniões por dia e a meta da taxa
--    de agendamento. Flag por empresa (orgs.metas_so_taxas).
alter table public.orgs add column metas_so_taxas boolean not null default false;

update public.orgs
set metas_so_taxas = true,
    paginas_ocultas = array['/bonus-sdr', 'config:bonus', '/iscas']
where id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a';
