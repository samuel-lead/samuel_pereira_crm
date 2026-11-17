-- Samuel (17/11/26): no Farming, só conta (e só avisa) lead parado/atrasado nas
-- etapas "Sem conversa iniciada" (1) e "Conversando" (2). Em "Leads" (0) e
-- "Adicionado no grupo" (3) não avisa.
do $$
declare d text;
begin
  select pg_get_functiondef('public.notificar_leads_parados'::regproc) into d;
  if position('l.nivel_ordem in (1, 2)' in d) = 0 then
    d := replace(d, 'and l.funil is null', 'and (l.funil is null or l.nivel_ordem in (1, 2))');
    execute d;
  end if;

  select pg_get_functiondef('public.listar_notificacoes'::regproc) into d;
  if position('l.nivel_ordem in (1, 2)' in d) = 0 then
    d := replace(d, 'and l.funil is null', 'and (l.funil is null or l.nivel_ordem in (1, 2))');
    execute d;
  end if;
end $$;
