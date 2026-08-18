-- Nova página configurável "Reuniões" (lista de todas as reuniões
-- marcadas, filtrável por closer). Segue a mesma régua das outras
-- páginas operacionais (funil/lista/atividades/métricas): admin vê
-- sempre, membro só se for liberado em Permissões.

alter table public.usuarios
  alter column paginas_permitidas
  set default array['funil', 'lista', 'atividades', 'reunioes', 'metricas'];

create or replace function public.atualizar_permissoes_usuario(
  usuario_id_alvo uuid,
  novo_papel text,
  novas_paginas text[],
  nova_funcao text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  org_do_chamador uuid;
  org_do_alvo uuid;
  papel_do_chamador text;
begin
  org_do_chamador := private.current_org_id();

  select papel into papel_do_chamador from public.usuarios where id = auth.uid();
  if papel_do_chamador is distinct from 'admin' then
    raise exception 'Só administradores podem alterar permissões';
  end if;

  select org_id into org_do_alvo from public.usuarios where id = usuario_id_alvo;
  if org_do_alvo is null or org_do_alvo <> org_do_chamador then
    raise exception 'Usuário não encontrado nessa organização';
  end if;

  if novo_papel not in ('admin', 'membro') then
    raise exception 'Papel inválido';
  end if;

  if nova_funcao is not null and nova_funcao not in ('sdr', 'closer') then
    raise exception 'Função inválida';
  end if;

  update public.usuarios
  set papel = novo_papel,
      paginas_permitidas = case
        when novo_papel = 'admin' then array['funil', 'lista', 'atividades', 'reunioes', 'metricas']
        else coalesce(novas_paginas, array[]::text[])
      end,
      funcao = nova_funcao
  where id = usuario_id_alvo;
end;
$$;
