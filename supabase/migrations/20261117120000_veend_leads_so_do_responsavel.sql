-- Samuel (17/11/26): na Veend (CRM do Danilo) cada SDR só vê os próprios leads.
-- Admin vê tudo; lead sem responsável continua visível pra todos. Mesma regra
-- da Banker e da Inove Gôndolas (orgs.leads_so_do_responsavel).
update public.orgs set leads_so_do_responsavel = true where id = '1cc080fd-055d-4f8b-950c-7537cf4f0064';
