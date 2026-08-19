-- Quando chega a hora do "próximo contato" marcado num lead PARADO (sem
-- engajamento ativo: Leads, Sem conversa iniciada, No Show ou Base), o
-- lead volta pro Nível 0 (Leads) pro SDR abordar de novo. NÃO mexe em
-- lead que já está em negociação ativa (Em qualificação, Topou reunião,
-- Reunião marcada, Oportunidades) — só reativa quem esfriou.
create extension if not exists pg_cron;

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
      and nivel_ordem in (0, 1, 5, 7)
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

revoke all on function public.mover_leads_prontos_para_contato() from public, anon;
grant execute on function public.mover_leads_prontos_para_contato() to authenticated;

select cron.schedule(
  'mover-leads-prontos-contato',
  '*/10 * * * *',
  $$select public.mover_leads_prontos_para_contato()$$
);
