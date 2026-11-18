-- Samuel (18/11/26): no aviso de pós-venda do WhatsApp o rótulo é "Motivo do contato".
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
         l.nome, l.origem, l.telefone_e164, l.declarado_em, l.vendido_em, l.pos_venda_motivo as motivo,
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

        -- Mensagem própria do pós-venda (Samuel, 18/11/26): mostra QUANDO FOI A COMPRA
        -- no lugar de "Entrou", e o motivo/data do contato.
        v_extra := v_emoji || ' *' || upper(v_titulo) || '*' || E'\n\n'
          || '👤 ' || r.nome || E'\n'
          || '📍 Origem: ' || coalesce(r.origem, 'não informada') || E'\n'
          || '🛒 Compra: ' || coalesce(to_char(r.vendido_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'), 'data não informada') || E'\n'
          || '📌 Motivo do contato: ' || coalesce(r.motivo, 'não informado') || E'\n'
          || '📅 Contato: ' || to_char(r.dia, 'DD/MM/YYYY')
          || case r.tipo when 'pos_venda_antes' then ' (amanhã)' when 'pos_venda_hoje' then ' (hoje)' else ' (atrasado)' end
          || case when r.responsavel_id is not null and r.responsavel_id <> r.usuario_id
                  then E'\n👤 Responsável: ' || coalesce(r.responsavel_nome, '') else '' end
          || E'\n\n💬 Falar no WhatsApp: https://wa.me/' || regexp_replace(coalesce(r.telefone_e164, ''), '\D', '', 'g');

        perform private.chamar_enviar_whatsapp(r.usuario_id, v_extra);
        perform private.chamar_enviar_push(
          r.usuario_id, v_titulo, r.nome || coalesce(' — ' || r.motivo, ''), '/leads/vendas/pos-venda'
        );
      end loop;
    end if;
  end loop;
end;
$function$;
