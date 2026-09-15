-- Tira o "(s)" preguiçoso ("lead(s) novo(s)") e escreve certo: singular
-- quando é 1, plural quando é mais — Samuel pediu explicitamente.
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
  v_rotulo_singular text;
  v_rotulo_plural text;
  v_linha_leads text;
  v_linha_marcadas text;
  v_linha_realizadas text;
  v_linha_vendas text;
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

    v_rotulo_singular := case when v_usuario.publico = 'imobiliario' then 'visita' else 'reunião' end;
    v_rotulo_plural := case when v_usuario.publico = 'imobiliario' then 'visitas' else 'reuniões' end;

    v_linha_leads := case
      when v_leads_novos = 1 then '1 lead novo'
      else v_leads_novos || ' leads novos'
    end;

    v_linha_marcadas := case
      when v_reunioes_marcadas = 1 then '1 ' || v_rotulo_singular || ' marcada'
      else v_reunioes_marcadas || ' ' || v_rotulo_plural || ' marcadas'
    end;

    v_linha_realizadas := case
      when v_reunioes_realizadas = 1 then '1 ' || v_rotulo_singular || ' realizada'
      else v_reunioes_realizadas || ' ' || v_rotulo_plural || ' realizadas'
    end;

    v_linha_vendas := case
      when v_vendas = 1 then '1 venda'
      else v_vendas || ' vendas'
    end;

    perform private.chamar_enviar_whatsapp(
      v_usuario.id,
      '📊 *RESUMO DO DIA*' || E'\n\n' ||
      '🆕 ' || v_linha_leads || E'\n' ||
      '📅 ' || v_linha_marcadas || E'\n' ||
      '✅ ' || v_linha_realizadas || E'\n' ||
      '💰 ' || v_linha_vendas
    );
  end loop;
end;
$$;
