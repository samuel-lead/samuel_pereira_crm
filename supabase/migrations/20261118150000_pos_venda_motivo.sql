-- Samuel (18/11/26): o próximo contato de pós-venda mostra o MOTIVO do contato
-- (o que é pra fazer/tratar), ao lado da data, na aba Pós-venda.
alter table public.leads add column if not exists pos_venda_motivo text;
