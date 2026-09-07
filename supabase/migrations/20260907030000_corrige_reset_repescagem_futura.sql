-- Bug pego pelo Samuel: o job que devolve lead parado pra "Novos Leads"
-- quando chega a data do próximo contato também estava pegando leads em
-- Oportunidades marcados como "Repescagem futura de ICP" (nível 8 +
-- oportunidade_futura = true) — um deles (Paulo Ribeiro) foi jogado de
-- volta pra Novos Leads sem ninguém pedir. Esse nível só deve voltar pro
-- funil quando alguém clica em "Reativar" manualmente (ver
-- base-leads-board.tsx) — nunca sozinho. Só quem realmente deve voltar
-- automático é quem está na Base (nível 9).
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
        entrou_nivel_em = now(),
        proximo_follow_em = null
    where id = v_lead.id;
  end loop;
end;
$$;
