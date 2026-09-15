-- O resumo diário era uma linha corrida de texto, bem diferente do
-- padrão emoji + *negrito* + linhas separadas que o resto das
-- notificações de WhatsApp já usa (ver private.formatar_lembrete_lead e
-- 20260826130000_notificacoes_falam_visita_no_imobiliario.sql). Samuel
-- pediu pra deixar no mesmo padrão. Também passa a falar "visita" em vez
-- de "reunião" pro público imobiliário, igual o resto dos lembretes já
-- faz.
create or replace function public.enviar_relatorio_diario()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario record;
  v_leads_novos int;
  v_reunioes_marcadas int;
  v_reunioes_realizadas int;
  v_vendas int;
  v_rotulo text;
begin
  for v_usuario in
    select u.id, u.nome, coalesce(o.publico, 'mentoria') as publico
    from usuarios u
    left join orgs o on o.id = u.org_id
    where u.wpp_comercial_e164 is not null
  loop
    select count(*) into v_leads_novos
    from leads
    where responsavel_id = v_usuario.id
      and declarado_em::date = current_date;

    select count(*) into v_reunioes_marcadas
    from reunioes
    where (usuario_id = v_usuario.id or closer_id = v_usuario.id)
      and marcada_em::date = current_date;

    select count(*) into v_reunioes_realizadas
    from reunioes
    where (usuario_id = v_usuario.id or closer_id = v_usuario.id)
      and status = 'realizada'
      and agendada_para::date = current_date;

    select count(*) into v_vendas
    from leads
    where responsavel_id = v_usuario.id
      and status = 'vendido'
      and vendido_em::date = current_date;

    if v_leads_novos = 0 and v_reunioes_marcadas = 0 and v_reunioes_realizadas = 0 and v_vendas = 0 then
      continue;
    end if;

    v_rotulo := case when v_usuario.publico = 'imobiliario' then 'visita(s)' else 'reunião(ões)' end;

    perform private.chamar_enviar_whatsapp(
      v_usuario.id,
      '📊 *RESUMO DO DIA*' || E'\n\n' ||
      '🆕 ' || v_leads_novos || ' lead(s) novo(s)' || E'\n' ||
      '📅 ' || v_reunioes_marcadas || ' ' || v_rotulo || ' marcada(s)' || E'\n' ||
      '✅ ' || v_reunioes_realizadas || ' ' || v_rotulo || ' realizada(s)' || E'\n' ||
      '💰 ' || v_vendas || ' venda(s)'
    );
  end loop;
end;
$$;
