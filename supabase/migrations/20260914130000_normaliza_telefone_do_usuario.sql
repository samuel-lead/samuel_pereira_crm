-- wpp_comercial_e164 (número que recebe os lembretes por WhatsApp) nunca
-- teve a mesma normalização que telefone_e164 dos leads já tem desde
-- 26/08 — Samuel perguntou se os lembretes estavam chegando certo pra
-- todo mundo, e achei um usuário real com número sem o "55" na frente
-- ("62996940786" em vez de "5562996940786"), o que faz a Z-API rejeitar
-- ou mandar pro número errado. Reaproveita a mesma função
-- public.normalizar_telefone já usada nos leads.
create or replace function public.normalizar_telefone_usuario()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.wpp_comercial_e164 := public.normalizar_telefone(new.wpp_comercial_e164);
  return new;
end;
$$;

drop trigger if exists trg_normalizar_telefone_usuario on public.usuarios;
create trigger trg_normalizar_telefone_usuario
  before insert or update of wpp_comercial_e164 on public.usuarios
  for each row
  execute function public.normalizar_telefone_usuario();

-- Corrige quem já estava cadastrado errado (dispara o trigger acima).
update public.usuarios
set wpp_comercial_e164 = wpp_comercial_e164
where wpp_comercial_e164 is not null;
