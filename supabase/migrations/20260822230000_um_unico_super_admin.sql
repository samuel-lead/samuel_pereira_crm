-- Só existe UM dono da plataforma. Trava isso no banco (não só na regra
-- de negócio) — nenhuma linha nova consegue ter super_admin = true se já
-- existir outra assim, o Postgres recusa o insert/update sozinho.
create unique index usuarios_um_unico_super_admin_idx
  on public.usuarios (super_admin)
  where super_admin = true;
