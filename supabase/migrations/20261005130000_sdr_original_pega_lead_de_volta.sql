-- O botão "Pegar esse lead pra mim" do SDR que marcou a reunião, em lead
-- que já foi pro Closer (Follow após reunião / Oportunidades), mostrava
-- "Lead pego ✓" mas NÃO trocava o responsável: a policy de UPDATE de
-- leads só deixa mexer quem é o responsável atual, admin ou closer da
-- reunião ativa — o UPDATE do SDR era barrado pela policy sem dar erro
-- (0 linhas alteradas), e o SDR continuava sem poder mover nada.
--
-- Mesmo desenho de transferir_lead_para_closer: função security definer
-- que confere a regra no banco e faz a troca. Regra: mesma empresa, lead
-- em Follow após reunião (7) ou Oportunidades (8), e quem chama é o SDR
-- que marcou a primeira reunião do lead.
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

  if v_nivel not in (7, 8) then
    raise exception 'Só dá pra pegar de volta lead em Follow após reunião ou Oportunidades';
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

revoke all on function public.reivindicar_lead_sdr_original(uuid) from public, anon;
grant execute on function public.reivindicar_lead_sdr_original(uuid) to authenticated;
