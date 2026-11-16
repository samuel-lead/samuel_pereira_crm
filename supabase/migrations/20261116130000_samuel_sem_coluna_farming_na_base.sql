-- Samuel (16/11/26): a coluna "Farming" sai da Base de leads do CRM dele — o
-- Farming agora é um funil próprio (menu "Farming", leads.funil = 'farming').
update public.orgs set sem_farming = true where id = 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
