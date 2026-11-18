-- Samuel (18/11/26): na Veend (CRM do Danilo) a regra "cada SDR só vê os próprios
-- leads" (ligada em 17/11) foi desligada — todos da equipe voltam a ver todos
-- os leads. (A chave clientes_visiveis_para_todos fica ligada, sem efeito.)
update public.orgs set leads_so_do_responsavel = false where id = '1cc080fd-055d-4f8b-950c-7537cf4f0064';
