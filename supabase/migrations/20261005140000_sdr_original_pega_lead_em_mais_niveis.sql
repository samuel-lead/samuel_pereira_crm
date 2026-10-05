-- Samuel: o SDR que marcou a reunião também precisa conseguir pegar o lead
-- de volta em "Precisa reagendar" (e nos outros níveis de reunião), não só
-- em Follow/Oportunidades. Caso real: lead Ferreira (Veend) ficou com o
-- Closer em "Precisa reagendar" depois que a segunda reunião, marcada pelo
-- próprio Closer, foi cancelada. Troca só a lista de níveis aceitos pela
-- função criada em 20261005130000_sdr_original_pega_lead_de_volta.sql.
create or replace function public.reivindicar_lead_sdr_original(p_lead_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_nivel int;
  v_sdr_original uuid;
begin
  select org_id, nivel_ordem into v_org, v_nivel
  from public.leads
  where id = p_lead_id;

  if v_org is null or v_org <> private.current_org_id() then
    raise exception 'Lead não encontrado nessa organização';
  end if;

  if v_nivel not in (4, 5, 6, 7, 8) then
    raise exception 'Só dá pra pegar de volta lead que já está na fase de reunião';
  end if;

  select usuario_id into v_sdr_original
  from public.reunioes
  where lead_id = p_lead_id
  order by marcada_em asc
  limit 1;

  if v_sdr_original is distinct from auth.uid() then
    raise exception 'Só o SDR que marcou a reunião pode pegar esse lead de volta';
  end if;

  update public.leads
  set responsavel_id = auth.uid()
  where id = p_lead_id;
end;
$$;
