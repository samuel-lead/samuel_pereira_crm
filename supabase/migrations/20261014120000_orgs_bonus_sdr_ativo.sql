-- Samuel (14/10/26): a empresa "Banker - Consorcio" não usa bônus de SDR.
-- Liga/desliga por empresa: o padrão continua ligado (nada muda pras outras).
alter table public.orgs add column bonus_sdr_ativo boolean not null default true;

update public.orgs set bonus_sdr_ativo = false where id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed';
