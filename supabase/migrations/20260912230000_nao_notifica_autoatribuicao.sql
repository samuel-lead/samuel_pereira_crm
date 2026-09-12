-- Samuel pediu: quando a PRÓPRIA pessoa move um lead pra si mesma
-- (reivindicar, ou editar o campo responsável pro seu próprio nome), ela
-- não precisa receber aviso — ela já sabe, acabou de fazer isso. Só avisa
-- quando é OUTRA pessoa quem atribui/transfere o lead pra ela.
--
-- auth.uid() dentro do trigger reflete quem está autenticado na sessão
-- que disparou o UPDATE (as escritas do painel sempre passam pelo
-- cliente autenticado, nunca service_role, regra do projeto) — comparar
-- com o novo responsavel_id basta pra saber se foi autoatribuição.
create or replace function public.notificar_lead_atribuido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linhas int;
  v_qualificacao text;
begin
  if new.responsavel_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.responsavel_id is not distinct from new.responsavel_id then
    return new;
  end if;

  -- Autoatribuição (reivindicar lead, ou editar e escolher a si mesmo) —
  -- não notifica quem já sabe que acabou de fazer isso.
  if new.responsavel_id = auth.uid() then
    return new;
  end if;

  insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
  values (new.org_id, new.responsavel_id, new.id, 'lead_novo', '')
  on conflict do nothing;

  get diagnostics v_linhas = row_count;

  if v_linhas > 0 then
    select nivel_qualificacao into v_qualificacao
    from isca_respostas
    where lead_id = new.id
    order by created_at desc
    limit 1;

    perform private.chamar_enviar_push(
      new.responsavel_id,
      'Lead novo',
      new.nome || ' acabou de ser atribuído a você. Origem: ' || coalesce(new.origem, 'não informada'),
      '/leads/' || new.id
    );
    perform private.chamar_enviar_whatsapp(
      new.responsavel_id,
      private.formatar_lembrete_lead('🆕', 'Lead novo', new.nome, new.origem, new.declarado_em, new.telefone_e164, null, v_qualificacao)
    );
  end if;

  return new;
end;
$$;
