-- Ajusta a regra de qualificação — Samuel simplificou: quem não tem
-- prioridade em resolver agora é sempre desqualificado, não importa o
-- tempo de mercado. Só entre quem TEM prioridade que o tempo de mercado
-- decide entre qualificado e super qualificado.
create or replace function public.criar_lead_via_isca(
  p_slug text,
  p_nome text,
  p_telefone_e164 text,
  p_instagram text default null,
  p_tempo_mercado text default null,
  p_maior_desafio text default null,
  p_prioridade boolean default null,
  p_atuacao text default null
)
returns table(lead_id uuid, material_url text, ja_existia boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_isca record;
  v_lead_id uuid;
  v_ja_existia boolean := false;
  v_tempo_alto boolean;
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
  where org_id = v_isca.org_id and telefone_e164 = p_telefone_e164
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

    v_nivel_qualificacao := case
      when p_prioridade is not true then 'desqualificado'
      when v_tempo_alto then 'super_qualificado'
      else 'qualificado'
    end;

    insert into isca_respostas (org_id, lead_id, isca_id, tempo_mercado, maior_desafio, prioridade, atuacao, nivel_qualificacao)
    values (v_isca.org_id, v_lead_id, v_isca.id, p_tempo_mercado, p_maior_desafio, p_prioridade, p_atuacao, v_nivel_qualificacao);
  end if;

  return query select v_lead_id, v_isca.material_url, v_ja_existia;
end;
$$;
