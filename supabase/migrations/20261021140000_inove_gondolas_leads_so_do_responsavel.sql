-- Samuel (21/10/26): na Inove Gôndolas cada SDR só vê os PRÓPRIOS leads (mesma
-- regra da Banker). Lead sem dono continua visível pros dois; o admin vê tudo.
update public.orgs set leads_so_do_responsavel = true
where id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a';
