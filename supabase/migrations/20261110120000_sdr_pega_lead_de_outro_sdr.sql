-- Samuel (10/11/26): a Julia (SDR que qualifica) precisa conseguir abrir um lead
-- que está com o Luiz Paulo (SDR que aborda) e passar ele pra ela. Antes só o
-- responsável (ou admin) passava. Agora um SDR também pode PEGAR PRA SI um lead
-- que está com outro SDR. O Luiz continua registrado como "SDR da abordagem"
-- (gatilho registrar_sdr_abordagem).

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
  v_funcao_atual text;
  v_funcao_responsavel text;
  v_pegando_pra_mim boolean;
begin
  select responsavel_id, org_id, status into v_responsavel, v_org, v_status
  from public.leads
  where id = p_lead_id and arquivado_em is null;

  if v_org is null or v_org <> private.current_org_id() then
    raise exception 'Lead não encontrado nessa organização';
  end if;

  select funcao into v_funcao_atual from public.usuarios where id = auth.uid();
  select funcao into v_funcao_responsavel from public.usuarios where id = v_responsavel;

  -- SDR pegando pra si um lead que está com outro SDR.
  v_pegando_pra_mim := v_funcao_atual = 'sdr'
    and p_novo_sdr_id = auth.uid()
    and v_funcao_responsavel = 'sdr';

  if not (private.eh_admin() or v_responsavel = auth.uid() or v_pegando_pra_mim) then
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
