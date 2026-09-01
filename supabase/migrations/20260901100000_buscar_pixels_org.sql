-- Devolve só o Pixel do Meta e a tag do Google da empresa dona da isca —
-- a página pública da isca (visitante anônimo, sem login) não pode
-- consultar a tabela orgs direto (tem dado de outras empresas ali), então
-- essa função abre uma portinha bem estreita, só com o que a página
-- precisa pra montar o rastreamento.
create or replace function public.buscar_pixels_org(p_slug text)
returns table(meta_pixel_id text, google_tag_id text)
language sql
security definer
set search_path = public
as $$
  select o.meta_pixel_id, o.google_tag_id
  from iscas i
  join orgs o on o.id = i.org_id
  where i.slug = p_slug and i.ativo = true and i.arquivado_em is null
  limit 1;
$$;

grant execute on function public.buscar_pixels_org(text) to anon, authenticated;
