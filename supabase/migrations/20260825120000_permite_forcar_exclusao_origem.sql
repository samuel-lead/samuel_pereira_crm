-- Samuel pediu: continuar avisando quantos leads usam a origem, mas não
-- travar a exclusão de vez — se ele confirmar mesmo assim, a origem some
-- da lista e os leads que usavam ela mantêm o texto antigo (não tem FK,
-- então não sobra nada quebrado, só uma origem "livre" que não está mais
-- cadastrada).
drop function if exists public.excluir_origem(uuid);

create function public.excluir_origem(origem_id uuid, forcar boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  org_da_origem uuid;
  nome_origem text;
  qtd_leads int;
begin
  select org_id, nome into org_da_origem, nome_origem
  from public.origens
  where id = origem_id and org_id = private.current_org_id();

  if org_da_origem is null then
    raise exception 'Origem não encontrada nessa organização';
  end if;

  select count(*) into qtd_leads
  from public.leads
  where org_id = org_da_origem and origem = nome_origem;

  if qtd_leads > 0 and not forcar then
    return jsonb_build_object('excluido', false, 'quantidade_leads', qtd_leads);
  end if;

  delete from public.origens where id = origem_id;
  return jsonb_build_object('excluido', true, 'quantidade_leads', qtd_leads);
end;
$$;

revoke all on function public.excluir_origem(uuid, boolean) from public, anon;
grant execute on function public.excluir_origem(uuid, boolean) to authenticated;
