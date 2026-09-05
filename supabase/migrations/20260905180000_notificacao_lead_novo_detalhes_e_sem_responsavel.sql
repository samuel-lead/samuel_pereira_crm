-- Duas coisas pedidas pelo Samuel:
-- 1) A notificação de "Lead novo" (quando ganha responsável) passa a
--    trazer origem, qualificação (se veio de isca) e nível — não só o
--    nome do lead.
-- 2) Lead que cai em "Novos Leads" (nível 0) SEM responsável nenhum
--    avisa TODO MUNDO da org, não só quem puxou — até alguém pegar o
--    lead pra si. É o caso do Samuel e a SDR dele, mas vale pra
--    qualquer org com mais gente também.

alter table push_notificacoes_enviadas
  drop constraint push_notificacoes_enviadas_tipo_check;

alter table push_notificacoes_enviadas
  add constraint push_notificacoes_enviadas_tipo_check
  check (tipo in ('lead_novo', 'contato_vencido', 'lead_parado', 'lead_sem_responsavel'));

create or replace function public.notificar_lead_atribuido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linhas int;
  v_nivel_nome text;
  v_qualificacao text;
  v_detalhes text;
begin
  if new.responsavel_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.responsavel_id is not distinct from new.responsavel_id then
    return new;
  end if;

  insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
  values (new.org_id, new.responsavel_id, new.id, 'lead_novo', '')
  on conflict do nothing;

  get diagnostics v_linhas = row_count;

  if v_linhas > 0 then
    select nome into v_nivel_nome from niveis where ordem = new.nivel_ordem;

    select nivel_qualificacao into v_qualificacao
    from isca_respostas
    where lead_id = new.id
    order by created_at desc
    limit 1;

    v_detalhes := 'Origem: ' || coalesce(new.origem, 'não informada');

    if v_qualificacao is not null then
      v_detalhes := v_detalhes || ' · ' || (
        case v_qualificacao
          when 'super_qualificado' then 'Super qualificado'
          when 'qualificado' then 'Qualificado'
          when 'desqualificado' then 'Desqualificado'
          else v_qualificacao
        end
      );
    end if;

    if v_nivel_nome is not null then
      v_detalhes := v_detalhes || ' · ' || v_nivel_nome;
    end if;

    perform private.chamar_enviar_push(
      new.responsavel_id,
      'Lead novo',
      new.nome || ' acabou de ser atribuído a você. ' || v_detalhes,
      '/leads/' || new.id
    );
  end if;

  return new;
end;
$$;

-- Lead sem responsável em "Novos Leads" — avisa todo mundo da org (até
-- alguém pegar o lead). Dispara na criação e sempre que o lead voltar a
-- ficar sem responsável estando em "Novos Leads" (ex.: reatribuição
-- removida manualmente).
create or replace function public.notificar_lead_sem_responsavel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario record;
  v_linhas int;
  v_nivel_nome text;
begin
  if new.responsavel_id is not null or new.nivel_ordem <> 0 then
    return new;
  end if;

  select nome into v_nivel_nome from niveis where ordem = new.nivel_ordem;

  for v_usuario in
    select id from usuarios where org_id = new.org_id
  loop
    insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
    values (new.org_id, v_usuario.id, new.id, 'lead_sem_responsavel', '')
    on conflict do nothing;

    get diagnostics v_linhas = row_count;

    if v_linhas > 0 then
      perform private.chamar_enviar_push(
        v_usuario.id,
        'Novo lead sem responsável',
        new.nome || ' caiu em "Novos Leads" sem responsável. Origem: ' ||
          coalesce(new.origem, 'não informada'),
        '/leads/' || new.id
      );
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.notificar_lead_sem_responsavel() from public, anon, authenticated;

create trigger trigger_notificar_lead_sem_responsavel
  after insert or update of responsavel_id, nivel_ordem on leads
  for each row
  execute function public.notificar_lead_sem_responsavel();
