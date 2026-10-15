-- Samuel (15/10/26): o SDR de uma venda/call é o SDR ORIGINAL do lead (quem
-- marcou a primeira reunião), e não quem marcou a reunião que aconteceu.
-- Vale pros CRMs de serviço/mentoria que têm Closer (todos menos a Banker -
-- Consorcio, que não tem Closer). Vale na tela Clientes e no Bônus SDR.
alter table public.orgs
  add column sdr_original boolean not null default false;

update public.orgs
set sdr_original = true
where publico = 'mentoria' and coalesce(sem_closer, false) = false;
