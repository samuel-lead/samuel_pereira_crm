-- Adiciona wpp_comercial_e164 no retorno de listar_usuarios_da_org — a
-- tela de Usuários precisa disso pra avisar quando alguém está sem
-- WhatsApp cadastrado (Samuel pediu esse aviso depois de descobrir que
-- 3 usuários nunca receberam nenhum lembrete por falta desse número).
drop function if exists public.listar_usuarios_da_org();

create function public.listar_usuarios_da_org()
returns table(
  id uuid,
  nome text,
  email text,
  criado_em timestamptz,
  papel text,
  funcao text,
  paginas_permitidas text[],
  foto_url text,
  dono boolean,
  wpp_comercial_e164 text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select u.id, u.nome, au.email, u.created_at, u.papel, u.funcao, u.paginas_permitidas, u.foto_url, u.dono, u.wpp_comercial_e164
  from public.usuarios u
  join auth.users au on au.id = u.id
  where u.org_id = private.current_org_id()
  order by u.created_at asc
$$;
