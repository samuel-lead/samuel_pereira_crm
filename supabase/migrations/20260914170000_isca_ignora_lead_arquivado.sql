-- Bug real: um cadastro novo na isca com um telefone que já foi de um lead
-- ARQUIVADO (excluído) batia no mesmo telefone e a function tratava como
-- "já existe" — não criava lead nenhum, não dava erro nem aviso, e a
-- pessoa só via a página de agradecimento normal como se tivesse
-- funcionado. Como lead arquivado não aparece em nenhuma coluna do
-- Kanban, o cadastro sumia sem deixar rastro. Samuel pegou isso ao vivo
-- testando de novo com um número que já tinha excluído antes.
create or replace function public.criar_lead_via_isca(
  p_slug text,
  p_nome text,
  p_telefone_e164 text,
  p_instagram text default null,
  p_tempo_mercado text default null,
  p_maior_desafio text default null,
  p_prioridade boolean default null,
  p_atuacao text default null,
  p_disponibilidade_financeira text default null
)
returns table(
  lead_id uuid,
  material_url text,
  whatsapp_contato_e164 text,
  whatsapp_mensagem text,
  ja_existia boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_isca record;
  v_lead_id uuid;
  v_ja_existia boolean := false;
  v_tempo_alto boolean;
  v_pode_investir boolean;
  v_nivel_qualificacao text;
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

  select id into v_lead_id from leads
  where org_id = v_isca.org_id and telefone_e164 = p_telefone_e164 and arquivado_em is null
  limit 1;

  if v_lead_id is not null then
    v_ja_existia := true;
  else
    insert into leads (org_id, usuario_id, nome, telefone_e164, instagram, origem, nivel_ordem, isca_id)
    values (v_isca.org_id, v_isca.usuario_id, trim(p_nome), p_telefone_e164, nullif(trim(p_instagram), ''), 'Isca: ' || v_isca.nome, 0, v_isca.id)
    returning id into v_lead_id;

    insert into origens (org_id, nome)
    values (v_isca.org_id, 'Isca: ' || v_isca.nome)
    on conflict (org_id, nome) do nothing;

    v_tempo_alto := p_tempo_mercado in ('Mais de 1 ano', 'Mais de 2 anos');
    v_pode_investir := p_disponibilidade_financeira = 'Sim, posso investir';

    v_nivel_qualificacao := case
      when p_prioridade is not true or not v_pode_investir then 'desqualificado'
      when v_tempo_alto then 'super_qualificado'
      else 'qualificado'
    end;

    insert into isca_respostas (org_id, lead_id, isca_id, tempo_mercado, maior_desafio, prioridade, atuacao, disponibilidade_financeira, nivel_qualificacao)
    values (v_isca.org_id, v_lead_id, v_isca.id, p_tempo_mercado, p_maior_desafio, p_prioridade, p_atuacao, p_disponibilidade_financeira, v_nivel_qualificacao);
  end if;

  return query select v_lead_id, v_isca.material_url, v_isca.whatsapp_contato_e164, v_isca.whatsapp_mensagem, v_ja_existia;
end;
$$;
