-- Inove Gôndolas (Samuel, 26/11/26): rotina própria do SDR, sem reunião:
--   1) confirmar o andamento dos leads enviados para o Elton
--   2) fazer follow com os leads da abordagem dos dias 1, 2 e 3
--   3) iniciar a prospecção de novos leads
-- Novo modelo de rotina 'gondolas' (orgs.rotina_modelo) + aviso no WhatsApp dele.

do $$
declare v_nome text;
begin
  select conname into v_nome
  from pg_constraint
  where conrelid = 'public.orgs'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%rotina_modelo%';
  if v_nome is not null then
    execute format('alter table public.orgs drop constraint %I', v_nome);
  end if;
end $$;

alter table public.orgs
  add constraint orgs_rotina_modelo_check check (rotina_modelo in ('padrao', 'banker', 'gondolas'));

update public.orgs set rotina_modelo = 'gondolas' where id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a';

-- Mensagens da rotina da Inove. Reaproveita 3 dos 5 horários (cron) que já existem:
-- 09:00 (confirmar_reunioes), 09:30 (retomar_conversas_follow_bloco1) e 10:30 (prospeccao).
-- Os horários das 16:00 e 16:30 não mandam nada pra Inove.
create or replace function private.mensagem_rotina_gondolas(p_atividade text, p_primeiro_nome text)
returns text
language plpgsql
immutable
as $$
declare
  v_emoji text;
  v_titulo text;
  v_inicio text;
  v_fim text;
  v_itens text;
begin
  case p_atividade
    when 'confirmar_reunioes' then
      v_emoji := '📞'; v_inicio := '09:00'; v_fim := '09:30';
      v_titulo := 'Andamento dos leads do Elton';
      v_itens := '• Confirmar o andamento dos leads enviados para o Elton';
    when 'retomar_conversas_follow_bloco1' then
      v_emoji := '💬'; v_inicio := '09:30'; v_fim := '10:30';
      v_titulo := 'Follow das abordagens (dias 1, 2 e 3)';
      v_itens := '• Fazer follow com os leads da abordagem dos dias 1, 2 e 3' || E'\n' ||
                 '• Pausar e atender na hora quem responder' || E'\n' ||
                 '• Depois, voltar à rotina';
    when 'prospeccao' then
      v_emoji := '📲'; v_inicio := '10:30'; v_fim := '17:00';
      v_titulo := 'Prospecção de novos leads';
      v_itens := '• Iniciar a prospecção de novos leads' || E'\n' ||
                 '• Pausar assim que qualquer lead responder' || E'\n' ||
                 '• Depois, voltar à rotina';
    else
      return null;
  end case;

  return
    v_emoji || ' *' || v_titulo || '*' || E'\n\n' ||
    'Oi, ' || p_primeiro_nome || '! Chegou a hora:' || E'\n\n' ||
    '🕘 Das ' || v_inicio || ' às ' || v_fim || E'\n\n' ||
    '📝 *O que fazer:*' || E'\n' ||
    v_itens || E'\n\n' ||
    '☑️ Terminou? Marque o check em *Minha rotina* no CRM.';
end;
$$;

create or replace function public.notificar_rotina_sdr(p_atividade text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario record;
  v_mensagem text;
begin
  -- Só dia útil (segunda a sexta, no horário de Brasília).
  if extract(isodow from (now() at time zone 'America/Sao_Paulo')) not between 1 and 5 then
    return;
  end if;

  for v_usuario in
    select u.id, u.nome, o.rotina_modelo
    from usuarios u
    join orgs o on o.id = u.org_id
    where u.funcao = 'sdr'
      and u.wpp_comercial_e164 is not null
      and coalesce(o.publico, 'mentoria') = 'mentoria'
      and o.status = 'ativo'
      and o.rotina_modelo in ('padrao', 'gondolas')
  loop
    if v_usuario.rotina_modelo = 'gondolas' then
      v_mensagem := private.mensagem_rotina_gondolas(p_atividade, split_part(v_usuario.nome, ' ', 1));
    else
      v_mensagem := private.mensagem_rotina(p_atividade, split_part(v_usuario.nome, ' ', 1));
    end if;
    if v_mensagem is not null then
      perform private.chamar_enviar_whatsapp(v_usuario.id, v_mensagem);
    end if;
  end loop;
end;
$$;

revoke all on function public.notificar_rotina_sdr(text) from public, anon, authenticated;
revoke all on function private.mensagem_rotina_gondolas(text, text) from public, anon, authenticated;
