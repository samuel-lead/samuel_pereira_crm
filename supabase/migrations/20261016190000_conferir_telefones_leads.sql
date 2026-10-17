-- Samuel pediu (16/10/26): a importação de leads precisa mostrar, ANTES de
-- gravar, quem já existe no CRM. Devolve, dos telefones recebidos, os que já
-- estão cadastrados na empresa de quem chama (incluindo leads excluídos).
-- Compara pelo número inteiro OU por DDD + 8 últimos dígitos (pega o mesmo
-- número escrito com e sem o 9 extra — o WhatsApp exporta sem ele).
create or replace function public.conferir_telefones_leads(p_telefones text[])
returns table(telefone text, nome text, excluido boolean)
language sql
stable
security definer
set search_path = public
as $$
  with eu as (select org_id from usuarios where id = auth.uid())
  select t.tel, l.nome, (l.arquivado_em is not null)
  from unnest(p_telefones) as t(tel)
  join leads l on l.org_id = (select org_id from eu)
    and l.telefone_e164 is not null
    and (
      l.telefone_e164 = t.tel
      or (
        t.tel like '55%' and l.telefone_e164 like '55%' and length(t.tel) >= 12
        and substring(l.telefone_e164 from 3 for 2) = substring(t.tel from 3 for 2)
        and right(l.telefone_e164, 8) = right(t.tel, 8)
      )
    );
$$;

revoke all on function public.conferir_telefones_leads(text[]) from public, anon;
grant execute on function public.conferir_telefones_leads(text[]) to authenticated;
