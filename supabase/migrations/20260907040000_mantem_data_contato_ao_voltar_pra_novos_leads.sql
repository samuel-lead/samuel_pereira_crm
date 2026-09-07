-- Samuel pediu: quando o lead da Base volta pra Novos Leads porque a
-- data do próximo contato chegou, essa data tem que continuar aparecendo
-- (atrasada, como qualquer contato vencido) — antes a função apagava
-- (proximo_follow_em = null), e a data sumia da tela sem deixar rastro.
create or replace function public.mover_leads_prontos_para_contato()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead record;
begin
  for v_lead in
    select id, org_id, nivel_ordem
    from public.leads
    where proximo_follow_em is not null
      and proximo_follow_em <= now()
      and status = 'ativo'
      and arquivado_em is null
      and nivel_ordem = 9
  loop
    insert into public.nivel_historico (org_id, lead_id, de_ordem, para_ordem, motivo, automatico)
    values (v_lead.org_id, v_lead.id, v_lead.nivel_ordem, 0, 'Chegou a data do próximo contato marcado', true);

    update public.leads
    set nivel_ordem = 0,
        entrou_nivel_em = now()
    where id = v_lead.id;
  end loop;
end;
$$;
