-- Fase 1, Tarefa 1.2 — seed inicial
-- Cria a org, o usuário, a configuração de metas padrão e os 6 níveis.
--
-- Pré-requisito: um usuário em auth.users já precisa existir (criado via
-- Admin API do Supabase Auth, não por SQL direto). Troque o uuid abaixo
-- pelo id do usuário de autenticação antes de rodar de novo em outro ambiente.

with novo_org as (
  insert into public.orgs (nome)
  values ('Samuel Pereira')
  returning id
),
novo_usuario as (
  insert into public.usuarios (id, org_id, nome)
  select '31f5b5d4-b3f0-4de3-82c1-2473800613bc'::uuid, id, 'Samuel Pereira'
  from novo_org
  returning id, org_id
),
nova_meta_config as (
  insert into public.metas_config (org_id, usuario_id)
  select org_id, id from novo_usuario
  returning id
),
novos_niveis as (
  insert into public.niveis (org_id, ordem, nome, definicao, prazo_dias, destino_ao_estourar, etiqueta_wpp)
  select novo_usuario.org_id, v.ordem, v.nome, v.definicao, v.prazo_dias, v.destino_ao_estourar, v.nome
  from novo_usuario, (values
    (1, 'Sem conversa iniciada', 'Mandei mensagem; o lead só visualizou, não respondeu, ou respondeu só "boa tarde" sem engatar', 5, 6),
    (2, 'Em qualificação', 'Conversa engatou, atendimento rolando, levantando os 3 critérios', null, null),
    (3, 'Topou reunião, sem horário', 'Qualificado e aceitou reunir, mas dia e hora não definidos', null, null),
    (4, 'Reunião marcada', 'Dia e hora definidos', null, null),
    (5, 'Reunião feita, sem fechar', 'Reuniu, proposta na mesa, não comprou ainda', null, null),
    (6, 'Base', 'Passou por todo o processo e não virou nada. Também recebe os do nível 1 que estouraram os 5 dias', null, null)
  ) as v(ordem, nome, definicao, prazo_dias, destino_ao_estourar)
  returning id
)
select
  (select count(*) from novo_usuario) as usuarios_criados,
  (select count(*) from nova_meta_config) as metas_config_criadas,
  (select count(*) from novos_niveis) as niveis_criados;
