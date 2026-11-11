-- Samuel (11/11/26): no CRM da Ketlyn, "lead de tráfego" = lead que veio de
-- FORMULÁRIO (origem "Formulário: ..."). A origem "Trafego" (lista importada)
-- NÃO entra nesse grupo. Troca só a regra do grupo especial '__trafego__' na
-- função relatorio_trafego (o resto da função continua igual).
do $$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'relatorio_trafego';

  d := replace(
    d,
    '(l.origem ~* ''^tr[aá]fego'' or l.origem like ''Formulário:%'')',
    '(l.origem like ''Formulário:%'')'
  );

  execute d;
end $$;
