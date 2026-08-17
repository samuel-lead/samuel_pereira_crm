-- Fase 1, Tarefa 1.3 — teste de isolamento por RLS
--
-- Prova que um usuário autenticado de uma org NÃO consegue ler leads de outra
-- org. Se esse teste falhar (ou seja, se a exceção "FALHA DE SEGURANCA" for
-- lançada), PARE TUDO — não é seguro seguir construindo em cima disso.
--
-- Como rodar:
-- 1) Crie dois usuários de teste no Supabase Auth (Admin API, não SQL direto)
--    e troque os dois uuids abaixo (:ID_A e :ID_B) pelos ids retornados.
-- 2) Rode este arquivo inteiro contra o banco (ex.: via SQL Editor do Supabase
--    ou `execute_sql`). Tudo roda dentro de uma transação com ROLLBACK no
--    final — nenhum dado de teste fica no banco depois.
-- 3) Depois, apague os dois usuários de teste via Admin API
--    (DELETE /auth/v1/admin/users/:id).

begin;

with org_a as (
  insert into public.orgs (nome) values ('__teste_rls_org_a__') returning id
), org_b as (
  insert into public.orgs (nome) values ('__teste_rls_org_b__') returning id
), usuario_a as (
  insert into public.usuarios (id, org_id, nome)
  select ':ID_A'::uuid, org_a.id, 'Teste RLS A' from org_a
  returning id, org_id
), usuario_b as (
  insert into public.usuarios (id, org_id, nome)
  select ':ID_B'::uuid, org_b.id, 'Teste RLS B' from org_b
  returning id, org_id
), lead_a as (
  insert into public.leads (org_id, usuario_id, nome)
  select usuario_a.org_id, usuario_a.id, 'Lead da Org A'
  from usuario_a
  returning id
)
select 1;

-- simula o usuário B tentando ler leads (deve ver 0 — nenhum é dele)
set local role authenticated;
set local request.jwt.claims to '{"sub":":ID_B"}';

do $$
declare v_b int;
begin
  select count(*) into v_b from public.leads;
  if v_b <> 0 then
    raise exception 'FALHA DE SEGURANCA: usuario da Org B enxergou % lead(s) da Org A', v_b;
  end if;
  raise notice 'OK passo 1: Org B viu % lead(s) da Org A (esperado 0)', v_b;
end $$;

reset role;

-- controle positivo: usuário A consegue ver o próprio lead
set local role authenticated;
set local request.jwt.claims to '{"sub":":ID_A"}';

do $$
declare v_a int;
begin
  select count(*) into v_a from public.leads;
  if v_a <> 1 then
    raise exception 'FALHA: usuario da propria Org A deveria ver 1 lead e viu %', v_a;
  end if;
  raise notice 'OK passo 2: Org A viu % lead(s) proprio(s) (esperado 1)', v_a;
end $$;

reset role;

rollback;
