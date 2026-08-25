-- Telefone de lead sempre no mesmo formato (só dígitos, com 55 na frente),
-- não importa de onde ele entrou (painel, WhatsApp, integração de anúncio,
-- qualquer coisa) — sem isso, "556281346409" e "+55 62 8134-6409" viram
-- dois leads "diferentes" pro banco, mesmo sendo o mesmo número, e a regra
-- de "não duplicar telefone" não pega. Espelha a lógica de
-- painel/lib/telefone.ts (normalizarTelefone).
create or replace function public.normalizar_telefone(valor text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  digitos text;
begin
  if valor is null then
    return null;
  end if;

  digitos := regexp_replace(valor, '\D', '', 'g');

  if digitos = '' then
    return '';
  end if;

  if length(digitos) >= 12 then
    return digitos;
  end if;

  if length(digitos) in (10, 11) then
    return '55' || digitos;
  end if;

  return digitos;
end;
$$;

create or replace function public.normalizar_telefone_lead()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.telefone_e164 := public.normalizar_telefone(new.telefone_e164);
  return new;
end;
$$;

drop trigger if exists trg_normalizar_telefone_lead on public.leads;
create trigger trg_normalizar_telefone_lead
  before insert or update of telefone_e164 on public.leads
  for each row
  execute function public.normalizar_telefone_lead();
