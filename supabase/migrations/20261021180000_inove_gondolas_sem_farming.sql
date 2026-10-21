-- Samuel (21/10/26): a Inove Gôndolas não usa "Farming" na Base de leads
-- (mesma regra da Banker - Consorcio).
update public.orgs set sem_farming = true
where id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a';
