-- Samuel (12/11/26): o relatório "Leads de tráfego" passa a aparecer pra TODO
-- mundo da empresa (SDR/Closer também), não só pro admin.
--
-- A função relatorio_trafego só devolvia dados se private.eh_admin() fosse
-- verdadeiro. Agora basta ser alguém logado e de uma empresa
-- (private.current_org_id() não nulo). A função continua SECURITY INVOKER: o
-- que cada pessoa enxerga ainda passa pelas regras (RLS) das tabelas — por
-- exemplo, empresa em que cada vendedor só vê os próprios leads continua assim.
do $$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'relatorio_trafego';

  if position('(select private.eh_admin()) as admin' in d) = 0 then
    raise exception 'trecho esperado não encontrado em relatorio_trafego';
  end if;

  d := replace(
    d,
    '(select private.eh_admin()) as admin',
    '(select private.current_org_id() is not null) as admin'
  );

  execute d;
end $$;
