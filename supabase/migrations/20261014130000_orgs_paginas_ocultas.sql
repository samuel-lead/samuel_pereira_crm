-- Samuel (14/10/26): a empresa "Banker - Consorcio" não usa o Bônus SDR nem
-- a Captura de leads. Em vez de um liga/desliga por página, cada empresa
-- passa a ter a lista das páginas escondidas dela (vazia = vê tudo). Troca o
-- liga/desliga do bônus (criado hoje cedo) por essa lista.
alter table public.orgs add column paginas_ocultas text[] not null default '{}';

update public.orgs
set paginas_ocultas = array['/bonus-sdr', '/iscas']
where id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed';

alter table public.orgs drop column bonus_sdr_ativo;
