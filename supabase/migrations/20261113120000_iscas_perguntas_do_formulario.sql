-- Samuel (13/11/26): no CRM imobiliário, quem cria o formulário de captura
-- escolhe quais perguntas ele tem (além de nome e WhatsApp, que são fixos).
-- Cada pergunta: { id, rotulo, tipo: 'texto' | 'opcoes', opcoes: [], obrigatoria }.
alter table public.iscas
  add column if not exists perguntas jsonb not null default '[]'::jsonb;

-- A página pública (visitante sem login) precisa ler as perguntas.
grant select (perguntas) on public.iscas to anon;

-- Guarda as respostas como uma nota no lead (aparece no histórico dele).
-- Só o servidor da página chama isso, logo depois de criar o lead, com o id
-- que acabou de voltar de criar_lead_via_isca (id impossível de adivinhar).
create or replace function public.registrar_respostas_formulario(
  p_slug text,
  p_lead_id uuid,
  p_respostas jsonb
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_isca record;
  v_texto text := '';
  v_item jsonb;
begin
  select * into v_isca from iscas
   where slug = p_slug and ativo = true and arquivado_em is null;
  if v_isca is null then
    raise exception 'Formulário não encontrado ou desativado';
  end if;

  if not exists (select 1 from leads where id = p_lead_id and org_id = v_isca.org_id) then
    raise exception 'Lead não encontrado';
  end if;

  if jsonb_typeof(p_respostas) <> 'array' or jsonb_array_length(p_respostas) = 0 then
    return;
  end if;
  if jsonb_array_length(p_respostas) > 20 then
    raise exception 'Respostas demais';
  end if;

  for v_item in select * from jsonb_array_elements(p_respostas) loop
    v_texto := v_texto || E'\n• ' || left(coalesce(v_item->>'pergunta', ''), 200)
               || ': ' || left(coalesce(v_item->>'resposta', ''), 1000);
  end loop;

  insert into interacoes (org_id, usuario_id, lead_id, tipo, canal, conteudo, ocorreu_em, origem)
  values (
    v_isca.org_id, v_isca.usuario_id, p_lead_id, 'nota', 'manual',
    'Respostas do formulário "' || v_isca.nome || '":' || v_texto,
    now(), 'declarado'
  );
end;
$$;
