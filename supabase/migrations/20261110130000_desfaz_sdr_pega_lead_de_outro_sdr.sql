-- Samuel (10/11/26): era só uma pergunta, não precisava liberar. Volta a regra
-- anterior: só o responsável pelo lead (ou admin) passa o lead pra outro SDR.
-- (Desfaz a migration 20261110120000.)

create or replace function public.passar_lead_para_sdr(p_lead_id uuid, p_novo_sdr_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_responsavel uuid;
  v_org uuid;
  v_status text;
  v_funcao_novo text;
  v_org_novo uuid;
begin
  select responsavel_id, org_id, status into v_responsavel, v_org, v_status
  from public.leads
  where id = p_lead_id and arquivado_em is null;

  if v_org is null or v_org <> private.current_org_id() then
    raise exception 'Lead não encontrado nessa organização';
  end if;

  if not (private.eh_admin() or v_responsavel = auth.uid()) then
    raise exception 'Só o responsável pelo lead (ou um admin) pode passar ele pra outro SDR';
  end if;

  if v_status = 'vendido' then
    raise exception 'Lead já vendido não pode ser passado';
  end if;

  select funcao, org_id into v_funcao_novo, v_org_novo
  from public.usuarios where id = p_novo_sdr_id;

  if v_org_novo is distinct from v_org or v_funcao_novo is distinct from 'sdr' then
    raise exception 'Escolha um SDR dessa empresa';
  end if;

  if p_novo_sdr_id = v_responsavel then
    raise exception 'Esse lead já está com esse SDR';
  end if;

  update public.leads
  set responsavel_id = p_novo_sdr_id
  where id = p_lead_id;
end;
$function$;
