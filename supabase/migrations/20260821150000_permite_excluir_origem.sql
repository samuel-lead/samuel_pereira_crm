-- Só dava pra criar e renomear origem, nunca excluir. Bloqueia a exclusão
-- se algum lead ainda usa essa origem (o nome é texto solto em `leads`,
-- sem FK) — evita deixar lead com uma origem "fantasma" que sumiu da lista.

create function public.excluir_origem(origem_id uuid)
returns void
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

  if qtd_leads > 0 then
    raise exception 'Essa origem está sendo usada por % lead%. Troque a origem desses leads (ou renomeie essa origem) antes de excluir.',
      qtd_leads, case when qtd_leads = 1 then '' else 's' end;
  end if;

  delete from public.origens where id = origem_id;
end;
$$;

revoke all on function public.excluir_origem(uuid) from public, anon;
grant execute on function public.excluir_origem(uuid) to authenticated;
