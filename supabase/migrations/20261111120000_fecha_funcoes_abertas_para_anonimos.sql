-- Endurecimento de segurança (11/11/26): funções do banco que qualquer pessoa
-- NÃO logada podia chamar pela internet (via /rest/v1/rpc/...), mas que só
-- fazem sentido pra quem está logado (ou nem deveriam ser chamadas de fora).
--
-- Já se protegiam por dentro (conferem se é super admin / a empresa da pessoa),
-- então nenhuma estava vazando dado — isto só fecha a porta, pra não depender
-- de uma única trava.
--
-- Continuam abertas pra quem não tem login, de propósito (páginas públicas):
--   criar_lead_via_isca, buscar_pixels_org, registrar_erro_isca, proximo_rodizio

-- 1) Só quem está logado (authenticated) e o servidor (service_role).
revoke execute on function public.listar_organizacoes_super_admin()      from public, anon;
revoke execute on function public.detalhe_org_super_admin(uuid)          from public, anon;
revoke execute on function public.listar_usuarios_org_super_admin(uuid)  from public, anon;
revoke execute on function public.marcar_org_como_paga(uuid)             from public, anon;
revoke execute on function public.listar_usuarios_da_org()               from public, anon;
revoke execute on function public.google_calendar_esta_conectado()       from public, anon;
revoke execute on function public.instagram_foto_uso_do_mes()            from public, anon;

grant execute on function public.listar_organizacoes_super_admin()      to authenticated, service_role;
grant execute on function public.detalhe_org_super_admin(uuid)          to authenticated, service_role;
grant execute on function public.listar_usuarios_org_super_admin(uuid)  to authenticated, service_role;
grant execute on function public.marcar_org_como_paga(uuid)             to authenticated, service_role;
grant execute on function public.listar_usuarios_da_org()               to authenticated, service_role;
grant execute on function public.google_calendar_esta_conectado()       to authenticated, service_role;
grant execute on function public.instagram_foto_uso_do_mes()            to authenticated, service_role;

-- 2) Funções de gatilho: só o próprio banco precisa executá-las (o gatilho
--    dispara sozinho). Ninguém deve poder chamá-las pela API.
revoke execute on function public.registrar_sdr_abordagem()      from public, anon, authenticated;
revoke execute on function public.registrar_uso_instagram_foto() from public, anon, authenticated;
