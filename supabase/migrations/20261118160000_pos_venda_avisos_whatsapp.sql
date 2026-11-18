-- Samuel (18/11/26): avisos de pós-venda no WhatsApp, em todos os CRMs, no mesmo
-- padrão dos outros avisos (reunião chegando / reunião atrasada / contato atrasado):
-- uma mensagem por situação, sem repetir.
--  * dia anterior ao contato  -> "Pós-venda amanhã"
--  * no dia do contato        -> "Pós-venda hoje"
--  * dia seguinte (passou)    -> "Pós-venda atrasado" (só contatos dos últimos 30 dias)
-- Quem recebe: o responsável pelo cliente E os admins da empresa (cada um uma vez).
-- Só entre 9h e 20h (horário de Brasília). Mais de 5 contatos pro mesmo destinatário
-- na mesma rodada viram UMA mensagem-resumo (pra não lotar o WhatsApp).
alter table public.push_notificacoes_enviadas
  drop constraint push_notificacoes_enviadas_tipo_check;
alter table public.push_notificacoes_enviadas
  add constraint push_notificacoes_enviadas_tipo_check
  check (tipo = any (array['lead_novo','contato_vencido','lead_parado','lead_sem_responsavel','reuniao_em_breve','reuniao_atrasada','lead_preencheu_de_novo','pos_venda_antes','pos_venda_hoje','pos_venda_atrasado']));

create or replace function public.notificar_pos_venda()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_hora int := extract(hour from (now() at time zone 'America/Sao_Paulo'))::int;
  g record;
  r record;
  v_emoji text;
  v_titulo text;
  v_extra text;
  v_lista text;
begin
  if v_hora < 9 or v_hora >= 20 then
    return;
  end if;

  drop table if exists _pv;
  create temp table _pv on commit drop as
  select u.id as usuario_id, l.id as lead_id, l.org_id, t.tipo, l.pos_venda_proximo_em::text as chave,
         l.nome, l.origem, l.telefone_e164, l.declarado_em, l.pos_venda_motivo as motivo,
         l.pos_venda_proximo_em as dia, l.responsavel_id, ur.nome as responsavel_nome
  from leads l
  cross join lateral (values
    ('pos_venda_antes',    l.pos_venda_proximo_em = v_hoje + 1),
    ('pos_venda_hoje',     l.pos_venda_proximo_em = v_hoje),
    ('pos_venda_atrasado', l.pos_venda_proximo_em < v_hoje and l.pos_venda_proximo_em >= v_hoje - 30)
  ) as t(tipo, ok)
  cross join lateral (
    select l.responsavel_id as id where l.responsavel_id is not null
    union
    select a.id from usuarios a where a.org_id = l.org_id and a.papel = 'admin'
  ) as u
  left join usuarios ur on ur.id = l.responsavel_id
  where t.ok
    and l.status = 'vendido'
    and l.arquivado_em is null
    and l.pos_venda_proximo_em is not null
    and not exists (
      select 1 from push_notificacoes_enviadas p
      where p.usuario_id = u.id and p.lead_id = l.id and p.tipo = t.tipo
        and p.chave = l.pos_venda_proximo_em::text
    );

  for g in select usuario_id, tipo, count(*) as n from _pv group by 1, 2 loop
    v_emoji := case g.tipo when 'pos_venda_antes' then '📅' when 'pos_venda_hoje' then '⏰' else '⚠️' end;
    v_titulo := case g.tipo when 'pos_venda_antes' then 'Pós-venda amanhã' when 'pos_venda_hoje' then 'Pós-venda hoje' else 'Pós-venda atrasado' end;

    if g.n > 5 then
      insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
      select org_id, usuario_id, lead_id, tipo, chave from _pv
      where usuario_id = g.usuario_id and tipo = g.tipo
      on conflict do nothing;

      select string_agg('• ' || nome || coalesce(' — ' || motivo, ''), E'\n' order by dia, nome)
        into v_lista
      from (select nome, motivo, dia from _pv where usuario_id = g.usuario_id and tipo = g.tipo order by dia, nome limit 10) x;

      perform private.chamar_enviar_whatsapp(
        g.usuario_id,
        v_emoji || ' *' || upper(v_titulo) || '*' || E'\n\n' ||
        '📋 ' || g.n || ' clientes pra contatar:' || E'\n' || v_lista ||
        case when g.n > 10 then E'\n• ... e mais ' || (g.n - 10) else '' end || E'\n\n' ||
        '💬 Veja tudo em Clientes → Pós-venda'
      );
      perform private.chamar_enviar_push(g.usuario_id, v_titulo, g.n || ' clientes pra contatar', '/leads/vendas/pos-venda');
    else
      for r in select * from _pv where usuario_id = g.usuario_id and tipo = g.tipo order by dia, nome loop
        insert into push_notificacoes_enviadas (org_id, usuario_id, lead_id, tipo, chave)
        values (r.org_id, r.usuario_id, r.lead_id, r.tipo, r.chave)
        on conflict do nothing;

        v_extra := '📌 Motivo: ' || coalesce(r.motivo, 'não informado')
          || E'\n📅 Contato: ' || to_char(r.dia, 'DD/MM/YYYY')
          || case r.tipo when 'pos_venda_antes' then ' (amanhã)' when 'pos_venda_hoje' then ' (hoje)' else ' (atrasado)' end
          || case when r.responsavel_id is not null and r.responsavel_id <> r.usuario_id
                  then E'\n👤 Responsável: ' || coalesce(r.responsavel_nome, '') else '' end;

        perform private.chamar_enviar_whatsapp(
          r.usuario_id,
          private.formatar_lembrete_lead(v_emoji, v_titulo, r.nome, r.origem, r.declarado_em, r.telefone_e164, v_extra)
        );
        perform private.chamar_enviar_push(
          r.usuario_id, v_titulo, r.nome || coalesce(' — ' || r.motivo, ''), '/leads/vendas/pos-venda'
        );
      end loop;
    end if;
  end loop;
end;
$function$;

revoke execute on function public.notificar_pos_venda() from public, anon, authenticated;
grant execute on function public.notificar_pos_venda() to service_role;

select cron.schedule('notificar-pos-venda', '*/15 * * * *', 'select public.notificar_pos_venda()');
