-- Samuel (17/11/26): ao mandar um lead da Base pro Farming, o motivo que ele tinha
-- na Base fica guardado (e aparece no card no Farming).
alter table public.leads
  add column if not exists farming_motivo_base text,
  add column if not exists farming_motivo_detalhe text;

-- Lead do Farming em "Leads" sem responsável NÃO é "novo lead sem dono": não avisa
-- o time inteiro no WhatsApp (o aviso de lead sem responsável ignora o funil Farming).
do $$
declare d text;
begin
  select pg_get_functiondef('public.notificar_lead_sem_responsavel'::regproc) into d;
  if position('new.funil is not null' in d) = 0 then
    d := replace(d, 'if new.responsavel_id is not null or new.nivel_ordem <> 0 then',
                    'if new.responsavel_id is not null or new.nivel_ordem <> 0 or new.funil is not null then');
    execute d;
  end if;
end $$;
