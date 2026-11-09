-- Samuel (09/11/26, CRM dele): o mesmo lead pode ter dois SDRs — um só aborda
-- (Instagram / base) e o outro, com mais experiência, qualifica. Quando o lead
-- passa de um SDR pro outro, o primeiro NÃO pode se perder: fica guardado em
-- leads.sdr_abordagem_id ("veio da abordagem do SDR tal"), e o responsavel_id
-- passa a ser quem qualifica.
--
-- Só vale pra empresa do Samuel por enquanto (a trava está no gatilho).

alter table public.leads
  add column if not exists sdr_abordagem_id uuid references public.usuarios(id);

comment on column public.leads.sdr_abordagem_id is
  'SDR que fez a abordagem do lead, quando ele foi passado pra outro SDR qualificar. Nunca é apagado.';

-- Grava a abordagem sozinho, por qualquer caminho (formulário do admin, kanban,
-- importação, função de passar o lead): quando o responsável troca de um SDR
-- pra outro SDR, o anterior vira o "SDR da abordagem" (se ainda não houver um).
create or replace function public.registrar_sdr_abordagem()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_samuel constant uuid := 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
  v_funcao_antigo text;
  v_funcao_novo text;
begin
  if new.org_id <> v_samuel or new.sdr_abordagem_id is not null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Lead criado por um SDR já entregue a outro SDR.
    if new.usuario_id is not null and new.responsavel_id is not null
       and new.usuario_id <> new.responsavel_id then
      select funcao into v_funcao_antigo from public.usuarios where id = new.usuario_id;
      select funcao into v_funcao_novo from public.usuarios where id = new.responsavel_id;
      if v_funcao_antigo = 'sdr' and v_funcao_novo = 'sdr' then
        new.sdr_abordagem_id := new.usuario_id;
      end if;
    end if;
  elsif old.responsavel_id is not null and new.responsavel_id is not null
        and new.responsavel_id <> old.responsavel_id then
    select funcao into v_funcao_antigo from public.usuarios where id = old.responsavel_id;
    select funcao into v_funcao_novo from public.usuarios where id = new.responsavel_id;
    if v_funcao_antigo = 'sdr' and v_funcao_novo = 'sdr' then
      new.sdr_abordagem_id := old.responsavel_id;
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_registrar_sdr_abordagem on public.leads;
create trigger trg_registrar_sdr_abordagem
  before insert or update of responsavel_id on public.leads
  for each row execute function public.registrar_sdr_abordagem();

-- O SDR que está com o lead não consegue gravar outro responsável direto (a
-- regra de segurança da tabela barra), então passar o lead pro outro SDR é
-- feito por esta função: confere quem pode e troca o responsável.
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

revoke all on function public.passar_lead_para_sdr(uuid, uuid) from public, anon;
grant execute on function public.passar_lead_para_sdr(uuid, uuid) to authenticated, service_role;
