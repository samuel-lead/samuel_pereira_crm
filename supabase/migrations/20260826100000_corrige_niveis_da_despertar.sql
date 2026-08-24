-- A org "DESPERTAR" foi criada depois da migration
-- 20260818231500_adiciona_nivel_follow_pos_reuniao.sql, então nunca recebeu
-- o nível "Follow após reunião" — ficou presa no esquema antigo de 8
-- estágios (0 a 7), enquanto o resto do sistema já usa 9 (0 a 8). Mesmo
-- bug que a Veend teve (ver 20260820010000_corrige_niveis_da_veend.sql),
-- aplicando a mesma correção pra essa org.

do $$
declare
  v_org_id uuid := '3eb65455-f672-4bb9-84df-e03f6c6c9cd4';
begin
  update public.leads set nivel_ordem = 8 where org_id = v_org_id and nivel_ordem = 7;
  update public.leads set nivel_ordem = 7 where org_id = v_org_id and nivel_ordem = 6;

  update public.niveis set ordem = 8 where org_id = v_org_id and ordem = 7;
  update public.niveis set ordem = 7 where org_id = v_org_id and ordem = 6;

  update public.niveis set destino_ao_estourar = 8 where org_id = v_org_id and destino_ao_estourar = 7;

  insert into public.niveis (org_id, ordem, nome, definicao, prazo_dias, destino_ao_estourar, etiqueta_wpp, numerado, destacado)
  values (
    v_org_id, 6, 'Follow após reunião',
    'A reunião aconteceu, mas ainda não deu pra saber se vira oportunidade ou não — precisa de retorno',
    null, null, 'Follow após reunião', false, true
  );
end $$;
