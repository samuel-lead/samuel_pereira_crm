-- Ajuste no critério de quem volta sozinho pro Nível 0 quando chega a
-- data do "próximo contato": só Base (nível 7) e Oportunidades futuras
-- (nível 6 com a marcação oportunidade_futura) — os leads "normais" (Sem
-- conversa iniciada, Em qualificação, No Show etc.) continuam só sendo
-- notificados no sino, sem trocar de nível sozinhos.
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
      and (
        nivel_ordem = 7
        or (nivel_ordem = 6 and oportunidade_futura = true)
      )
  loop
    insert into public.nivel_historico (org_id, lead_id, de_ordem, para_ordem, motivo, automatico)
    values (v_lead.org_id, v_lead.id, v_lead.nivel_ordem, 0, 'Chegou a data do próximo contato marcado', true);

    update public.leads
    set nivel_ordem = 0,
        oportunidade_futura = false,
        entrou_nivel_em = now(),
        proximo_follow_em = null
    where id = v_lead.id;
  end loop;
end;
$$;
