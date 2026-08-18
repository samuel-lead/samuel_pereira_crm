-- Quando a reunião é realizada (lead entra em "Oportunidades", saindo de
-- "Reunião marcada"), o lead passa a ser 100% responsabilidade do Closer
-- que fez a call — troca o responsavel_id automaticamente.
--
-- Precisa ser uma função com privilégio elevado (security definer) porque
-- quem dispara essa troca é normalmente o próprio SDR ou o Closer movendo
-- o lead de coluna — e a política de RLS de `leads` não deixa ninguém
-- (fora admin) transferir o lead pra OUTRA pessoa. A função faz sua própria
-- checagem de permissão por dentro, então continua seguro chamar direto.

create or replace function public.transferir_lead_para_closer(
  p_lead_id uuid,
  p_closer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_responsavel uuid;
  v_org uuid;
begin
  select responsavel_id, org_id into v_responsavel, v_org
  from public.leads
  where id = p_lead_id;

  if v_org is null or v_org <> private.current_org_id() then
    raise exception 'Lead não encontrado nessa organização';
  end if;

  if not (
    private.eh_admin()
    or v_responsavel = auth.uid()
    or private.eh_closer_da_reuniao_ativa(p_lead_id)
  ) then
    raise exception 'Sem permissão pra mexer nesse lead';
  end if;

  update public.leads
  set responsavel_id = p_closer_id
  where id = p_lead_id;
end;
$$;

revoke all on function public.transferir_lead_para_closer(uuid, uuid) from public, anon;
grant execute on function public.transferir_lead_para_closer(uuid, uuid) to authenticated;
