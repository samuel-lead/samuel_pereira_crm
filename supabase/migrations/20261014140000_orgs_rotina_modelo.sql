-- Samuel (14/10/26): a empresa "Banker - Consorcio" tem uma rotina própria
-- (1ª atividade: ligar para leads quentes; última: enviar relatórios).
-- 'padrao' = a rotina de sempre; 'banker' = a da Banker.
alter table public.orgs
  add column rotina_modelo text not null default 'padrao' check (rotina_modelo in ('padrao', 'banker'));

update public.orgs set rotina_modelo = 'banker' where id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed';

-- O aviso de rotina no WhatsApp (mensagens da rotina padrão) só vale pras
-- empresas na rotina padrão — a Banker ainda não tem SDR, e quando tiver o
-- aviso dela é feito à parte.
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
    select u.id, u.nome
    from usuarios u
    join orgs o on o.id = u.org_id
    where u.funcao = 'sdr'
      and u.wpp_comercial_e164 is not null
      and coalesce(o.publico, 'mentoria') = 'mentoria'
      and o.status = 'ativo'
      and o.rotina_modelo = 'padrao'
  loop
    v_mensagem := private.mensagem_rotina(p_atividade, split_part(v_usuario.nome, ' ', 1));
    if v_mensagem is not null then
      perform private.chamar_enviar_whatsapp(v_usuario.id, v_mensagem);
    end if;
  end loop;
end;
$$;

revoke all on function public.notificar_rotina_sdr(text) from public, anon, authenticated;
