-- Samuel (27/10/26): CRM da Ketlyn ganha "Captura de leads" no menu, com um
-- formulário público de 2 perguntas (nome e WhatsApp) e, embaixo, o botão que
-- leva direto pro WhatsApp dela. Serve pra inscritos e leads de tráfego.
--  * orgs.captura_leads: libera o item "Captura de leads" no menu de uma
--    empresa IMOBILIÁRIA (nas de mentoria ele sempre existiu).
--  * iscas.formulario_simples: o link público mostra só nome + WhatsApp, sem o
--    questionário de qualificação — e não grava resposta de qualificação (senão
--    o card do lead ficaria com a etiqueta "Desqualificado" sem ninguém ter
--    respondido nada).
alter table public.orgs add column captura_leads boolean not null default false;
alter table public.iscas add column formulario_simples boolean not null default false;

create or replace function public.criar_lead_via_isca(
  p_slug text, p_nome text, p_telefone_e164 text, p_instagram text default null,
  p_tempo_mercado text default null, p_maior_desafio text default null,
  p_prioridade boolean default null, p_atuacao text default null,
  p_disponibilidade_financeira text default null
)
returns table(lead_id uuid, material_url text, whatsapp_contato_e164 text, whatsapp_mensagem text, ja_existia boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_isca record;
  v_lead_id uuid;
  v_ja_existia boolean := false;
  v_tempo_alto boolean;
  v_pode_investir boolean;
  v_nivel_qualificacao text;
  v_origem text;
begin
  select * into v_isca from iscas
  where slug = p_slug and ativo = true and arquivado_em is null;

  if v_isca is null then
    raise exception 'Isca não encontrada ou desativada';
  end if;

  if p_nome is null or length(trim(p_nome)) = 0 then
    raise exception 'Nome é obrigatório';
  end if;

  if p_telefone_e164 is null or length(p_telefone_e164) < 12 then
    raise exception 'Telefone inválido';
  end if;

  v_origem := case when v_isca.formulario_simples then 'Formulário: ' else 'Isca: ' end || v_isca.nome;

  select id into v_lead_id from leads
  where org_id = v_isca.org_id and telefone_e164 = p_telefone_e164 and arquivado_em is null
  limit 1;

  v_tempo_alto := p_tempo_mercado in ('Mais de 1 ano', 'Mais de 2 anos');
  v_pode_investir := p_disponibilidade_financeira = 'Sim, posso investir';

  v_nivel_qualificacao := case
    when p_prioridade is not true or not v_pode_investir then 'desqualificado'
    when v_tempo_alto then 'super_qualificado'
    else 'qualificado'
  end;

  if v_lead_id is not null then
    v_ja_existia := true;

    if not v_isca.formulario_simples then
      insert into isca_respostas (org_id, lead_id, isca_id, tempo_mercado, maior_desafio, prioridade, atuacao, disponibilidade_financeira, nivel_qualificacao)
      values (v_isca.org_id, v_lead_id, v_isca.id, p_tempo_mercado, p_maior_desafio, p_prioridade, p_atuacao, p_disponibilidade_financeira, v_nivel_qualificacao);
    end if;

    insert into interacoes (org_id, usuario_id, lead_id, tipo, canal, conteudo, ocorreu_em, origem)
    values (
      v_isca.org_id,
      v_isca.usuario_id,
      v_lead_id,
      'nota',
      'manual',
      case when v_isca.formulario_simples
        then 'Preencheu de novo o formulário "' || v_isca.nome || '".'
        else 'Respondeu de novo pela isca "' || v_isca.nome || '".' end,
      now(),
      'declarado'
    );
  else
    insert into leads (org_id, usuario_id, nome, telefone_e164, instagram, origem, nivel_ordem, isca_id)
    values (v_isca.org_id, v_isca.usuario_id, trim(p_nome), p_telefone_e164, nullif(trim(p_instagram), ''), v_origem, 0, v_isca.id)
    returning id into v_lead_id;

    insert into origens (org_id, nome)
    values (v_isca.org_id, v_origem)
    on conflict (org_id, nome) do nothing;

    if not v_isca.formulario_simples then
      insert into isca_respostas (org_id, lead_id, isca_id, tempo_mercado, maior_desafio, prioridade, atuacao, disponibilidade_financeira, nivel_qualificacao)
      values (v_isca.org_id, v_lead_id, v_isca.id, p_tempo_mercado, p_maior_desafio, p_prioridade, p_atuacao, p_disponibilidade_financeira, v_nivel_qualificacao);
    end if;
  end if;

  return query select v_lead_id, v_isca.material_url, v_isca.whatsapp_contato_e164, v_isca.whatsapp_mensagem, v_ja_existia;
end;
$function$;

-- Ketlyn Ribeiro: menu liberado + o formulário dela já criado
-- (link: /ketlyn). WhatsApp +55 62 99161-2661.
update public.orgs set captura_leads = true where id = '475cb573-f3de-48a7-ae91-e45824c60514';

insert into public.iscas (org_id, usuario_id, nome, slug, material_url, ativo, whatsapp_contato_e164, whatsapp_mensagem, formulario_simples)
values (
  '475cb573-f3de-48a7-ae91-e45824c60514',
  'd87a2683-576c-4558-a6ec-c1aa7917e25c',
  'Cadastro Ketlyn Ribeiro',
  'ketlyn',
  null,
  true,
  '5562991612661',
  'Olá, Ketlyn! Acabei de me cadastrar no formulário e quero saber mais.',
  true
);
