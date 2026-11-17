-- Samuel (17/11/26): guarda que o lead passou pelo Farming, pra contar as
-- métricas do dia do Farming (ligações, calls marcadas/realizadas) mesmo depois
-- que ele sai do funil por ter marcado reunião.
alter table public.leads add column if not exists farming_origem boolean not null default false;

-- Quem já está no Farming conta como "do Farming" também.
update public.leads set farming_origem = true where funil = 'farming' and farming_origem = false;

create or replace function public.sair_do_farming_ao_avancar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.funil = 'farming' then
    new.farming_origem := true;
    if new.nivel_ordem not in (0, 1, 2, 3) then
      new.funil := null;
    end if;
  end if;
  return new;
end;
$$;
