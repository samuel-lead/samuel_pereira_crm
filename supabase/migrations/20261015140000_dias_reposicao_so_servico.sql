-- Os dias de reposição mexem no cálculo do bônus: só o sistema (service_role)
-- pode alterar, nunca o próprio usuário pela API.
revoke update (dias_reposicao) on public.usuarios from authenticated, anon;
